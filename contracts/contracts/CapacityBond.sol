// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CapacityBond
/// @notice Reservation-level native-BOT assurance for compute agreements made off-chain.
/// @dev This registry does not sell capacity, verify hardware, or underwrite service outcomes.
contract CapacityBond is EIP712, Ownable2Step, ReentrancyGuard {
    enum ReservationStatus {
        Draft,
        Funded,
        Active,
        Fulfilled,
        Claimable,
        Disputed,
        Resolved,
        Expired
    }

    struct ProviderProfile {
        string name;
        string contact;
        string metadataURI;
        uint64 registeredAt;
        uint64 updatedAt;
        bool active;
    }

    struct Reservation {
        uint256 id;
        address provider;
        address buyer;
        bytes32 agreementHash;
        string agreementURI;
        string capacity;
        uint256 bondAmount;
        uint64 serviceStart;
        uint64 serviceEnd;
        uint64 acceptanceDeadline;
        uint64 claimWindow;
        uint64 checkpointInterval;
        uint64 activatedAt;
        uint64 fundedAt;
        uint64 resolvedAt;
        uint64 claimDeadline;
        uint32 requiredCheckpoints;
        uint16 providerAwardBps;
        uint16 policyVersion;
        bool providerAccepted;
        bool buyerAccepted;
        ReservationStatus status;
        string buyerStatementURI;
        bytes32 buyerStatementHash;
        string resolutionURI;
        bytes32 resolutionHash;
    }

    struct Checkpoint {
        address attestor;
        address submitter;
        uint64 observedAt;
        uint64 submittedAt;
        bytes32 evidenceHash;
        string evidenceURI;
    }

    uint16 public constant POLICY_VERSION = 1;
    uint64 public constant MIN_GRACE_PERIOD = 2 minutes;
    uint64 public constant MAX_GRACE_PERIOD = 7 days;
    uint64 public constant MIN_CLAIM_WINDOW = 5 minutes;
    uint64 public constant MAX_CLAIM_WINDOW = 90 days;
    uint64 public constant MIN_CHECKPOINT_INTERVAL = 30 seconds;
    uint64 public constant MAX_SERVICE_DURATION = 365 days;
    uint32 public constant MAX_CHECKPOINTS = 100;

    bytes32 private constant CHECKPOINT_TYPEHASH = keccak256(
        "Checkpoint(uint256 reservationId,uint256 sequence,uint64 observedAt,bytes32 evidenceHash,string evidenceURI)"
    );

    address public attestor;
    address public resolver;
    uint64 public gracePeriod;

    uint256 public nextReservationId = 1;
    uint256 public lockedCollateral;
    uint256 public totalWithdrawable;

    mapping(address => ProviderProfile) private _providers;
    mapping(address => uint256) private _withdrawable;
    mapping(uint256 => Reservation) private _reservations;
    mapping(uint256 => Checkpoint[]) private _checkpoints;
    address[] private _providerList;

    error ZeroAddress();
    error InvalidRoleSeparation();
    error Unauthorized();
    error AlreadyRegistered();
    error NotRegistered();
    error EmptyField(string field);
    error FieldTooLong(string field);
    error BuyerIsProvider();
    error InvalidServiceWindow();
    error InvalidAcceptanceDeadline();
    error InvalidBondAmount();
    error InvalidClaimWindow();
    error InvalidCheckpointInterval();
    error InvalidGracePeriod();
    error TooManyCheckpoints();
    error InvalidAgreementReference();
    error InvalidState();
    error AcceptanceDeadlinePassed();
    error AcceptanceDeadlineNotReached();
    error AlreadyAccepted();
    error IncorrectBond();
    error CheckpointsComplete();
    error CheckpointsIncomplete();
    error GracePeriodNotElapsed();
    error ClaimWindowClosed();
    error ClaimWindowNotClosed();
    error NotBuyer();
    error NotResolver();
    error InvalidSplit();
    error InvalidSequence();
    error CheckpointOutsideServiceWindow();
    error CheckpointInFuture();
    error ServiceWindowOpen();
    error CheckpointDeadlinePassed();
    error CheckpointOutOfOrder();
    error InvalidEvidence();
    error InvalidSignature();
    error NoWithdrawableBalance();
    error TransferFailed();

    event ProviderRegistered(address indexed provider, string name, string contact, string metadataURI);
    event ProviderUpdated(address indexed provider, string name, string contact, string metadataURI);
    event ReservationCreated(
        uint256 indexed reservationId,
        address indexed provider,
        address indexed buyer,
        bytes32 agreementHash,
        string agreementURI,
        uint256 bondAmount,
        uint64 serviceStart,
        uint64 serviceEnd,
        uint64 acceptanceDeadline
    );
    event BondDeposited(uint256 indexed reservationId, address indexed provider, uint256 amount);
    event TermsAccepted(uint256 indexed reservationId, address indexed party, bool providerAccepted, bool buyerAccepted);
    event ReservationActivated(uint256 indexed reservationId, uint64 activatedAt);
    event CheckpointSubmitted(
        uint256 indexed reservationId,
        address indexed attestor,
        address indexed submitter,
        uint256 sequence,
        uint64 observedAt,
        uint64 submittedAt,
        bytes32 evidenceHash,
        string evidenceURI
    );
    event ReservationFulfilled(uint256 indexed reservationId, address indexed provider, uint256 amount, uint64 resolvedAt);
    event ReservationClaimable(
        uint256 indexed reservationId,
        uint256 checkpointsObserved,
        uint256 checkpointsRequired,
        uint64 claimDeadline
    );
    event DisputeOpened(
        uint256 indexed reservationId,
        address indexed buyer,
        string statementURI,
        bytes32 statementHash
    );
    event DisputeResolved(
        uint256 indexed reservationId,
        address indexed resolver,
        uint16 providerAwardBps,
        uint256 providerAmount,
        uint256 buyerAmount,
        string resolutionURI,
        bytes32 resolutionHash
    );
    event ReservationReleased(uint256 indexed reservationId, address indexed provider, uint256 amount, uint64 resolvedAt);
    event ReservationExpired(uint256 indexed reservationId, address indexed provider, uint256 refundedAmount);
    event Withdrawal(address indexed account, address indexed to, uint256 amount);
    event AttestorChanged(address indexed previousAttestor, address indexed newAttestor);
    event ResolverChanged(address indexed previousResolver, address indexed newResolver);
    event GracePeriodChanged(uint64 previousGracePeriod, uint64 newGracePeriod);

    modifier onlyRegisteredProvider() {
        if (!_providers[msg.sender].active) revert NotRegistered();
        _;
    }

    constructor(
        address initialOwner,
        address initialAttestor,
        address initialResolver,
        uint64 initialGracePeriod
    ) EIP712("CapacityBond", "1") Ownable(initialOwner) {
        if (initialAttestor == address(0) || initialResolver == address(0)) revert ZeroAddress();
        if (initialAttestor == initialResolver) revert InvalidRoleSeparation();
        _validateGracePeriod(initialGracePeriod);
        attestor = initialAttestor;
        resolver = initialResolver;
        gracePeriod = initialGracePeriod;
    }

    function registerProvider(
        string calldata name,
        string calldata contact,
        string calldata metadataURI
    ) external {
        if (_providers[msg.sender].active) revert AlreadyRegistered();
        _validateProviderFields(name, contact, metadataURI);
        uint64 nowTs = uint64(block.timestamp);
        _providers[msg.sender] = ProviderProfile({
            name: name,
            contact: contact,
            metadataURI: metadataURI,
            registeredAt: nowTs,
            updatedAt: nowTs,
            active: true
        });
        _providerList.push(msg.sender);
        emit ProviderRegistered(msg.sender, name, contact, metadataURI);
    }

    function updateProvider(
        string calldata name,
        string calldata contact,
        string calldata metadataURI
    ) external onlyRegisteredProvider {
        _validateProviderFields(name, contact, metadataURI);
        ProviderProfile storage profile = _providers[msg.sender];
        profile.name = name;
        profile.contact = contact;
        profile.metadataURI = metadataURI;
        profile.updatedAt = uint64(block.timestamp);
        emit ProviderUpdated(msg.sender, name, contact, metadataURI);
    }

    function getProvider(address provider) external view returns (ProviderProfile memory) {
        return _providers[provider];
    }

    function providerCount() external view returns (uint256) {
        return _providerList.length;
    }

    function providerAt(uint256 index) external view returns (address) {
        return _providerList[index];
    }

    function createReservation(
        address buyer,
        uint256 bondAmount,
        bytes32 agreementHash,
        string calldata agreementURI,
        string calldata capacity,
        uint64 serviceStart,
        uint64 serviceEnd,
        uint64 acceptanceDeadline,
        uint64 claimWindow,
        uint64 checkpointInterval
    ) external onlyRegisteredProvider returns (uint256 reservationId) {
        if (buyer == address(0)) revert ZeroAddress();
        if (buyer == msg.sender) revert BuyerIsProvider();
        if (bondAmount == 0) revert InvalidBondAmount();
        if (agreementHash == bytes32(0) || bytes(agreementURI).length == 0) revert InvalidAgreementReference();
        if (bytes(agreementURI).length > 256) revert FieldTooLong("agreementURI");
        if (bytes(capacity).length == 0) revert EmptyField("capacity");
        if (bytes(capacity).length > 280) revert FieldTooLong("capacity");
        if (serviceStart <= block.timestamp || serviceEnd <= serviceStart) revert InvalidServiceWindow();
        if (serviceEnd - serviceStart > MAX_SERVICE_DURATION) revert InvalidServiceWindow();
        if (acceptanceDeadline <= block.timestamp || acceptanceDeadline > serviceStart) {
            revert InvalidAcceptanceDeadline();
        }
        if (claimWindow < MIN_CLAIM_WINDOW || claimWindow > MAX_CLAIM_WINDOW) revert InvalidClaimWindow();
        if (checkpointInterval < MIN_CHECKPOINT_INTERVAL || checkpointInterval > serviceEnd - serviceStart) {
            revert InvalidCheckpointInterval();
        }

        uint256 required = (uint256(serviceEnd - serviceStart) + checkpointInterval - 1) / checkpointInterval;
        if (required == 0 || required > MAX_CHECKPOINTS) revert TooManyCheckpoints();

        reservationId = nextReservationId++;
        Reservation storage reservation = _reservations[reservationId];
        reservation.id = reservationId;
        reservation.provider = msg.sender;
        reservation.buyer = buyer;
        reservation.bondAmount = bondAmount;
        reservation.agreementHash = agreementHash;
        reservation.agreementURI = agreementURI;
        reservation.capacity = capacity;
        reservation.serviceStart = serviceStart;
        reservation.serviceEnd = serviceEnd;
        reservation.acceptanceDeadline = acceptanceDeadline;
        reservation.claimWindow = claimWindow;
        reservation.checkpointInterval = checkpointInterval;
        reservation.requiredCheckpoints = uint32(required);
        reservation.policyVersion = POLICY_VERSION;
        reservation.status = ReservationStatus.Draft;

        emit ReservationCreated(
            reservationId,
            msg.sender,
            buyer,
            agreementHash,
            agreementURI,
            bondAmount,
            serviceStart,
            serviceEnd,
            acceptanceDeadline
        );
    }

    /// @notice Fund the full bond for a draft reservation. The contract holds native BOT in escrow.
    function depositBond(uint256 reservationId) external payable onlyRegisteredProvider {
        Reservation storage reservation = _reservation(reservationId);
        if (reservation.provider != msg.sender) revert Unauthorized();
        if (reservation.status != ReservationStatus.Draft) revert InvalidState();
        if (block.timestamp > reservation.acceptanceDeadline) revert AcceptanceDeadlinePassed();
        if (msg.value != reservation.bondAmount) revert IncorrectBond();

        reservation.fundedAt = uint64(block.timestamp);
        reservation.status = ReservationStatus.Funded;
        lockedCollateral += msg.value;
        emit BondDeposited(reservationId, msg.sender, msg.value);
    }

    function acceptReservation(uint256 reservationId) external {
        Reservation storage reservation = _reservation(reservationId);
        if (reservation.status != ReservationStatus.Funded) revert InvalidState();
        if (block.timestamp > reservation.acceptanceDeadline) revert AcceptanceDeadlinePassed();

        if (msg.sender == reservation.provider) {
            if (reservation.providerAccepted) revert AlreadyAccepted();
            reservation.providerAccepted = true;
        } else if (msg.sender == reservation.buyer) {
            if (reservation.buyerAccepted) revert AlreadyAccepted();
            reservation.buyerAccepted = true;
        } else {
            revert Unauthorized();
        }

        emit TermsAccepted(
            reservationId,
            msg.sender,
            reservation.providerAccepted,
            reservation.buyerAccepted
        );

        if (reservation.providerAccepted && reservation.buyerAccepted) {
            if (block.timestamp > reservation.serviceStart) revert InvalidServiceWindow();
            reservation.status = ReservationStatus.Active;
            reservation.activatedAt = uint64(block.timestamp);
            emit ReservationActivated(reservationId, reservation.activatedAt);
        }
    }

    /// @notice Submit a test-attestor checkpoint. A signature proves authorisation, not compute quality.
    function submitCheckpoint(
        uint256 reservationId,
        uint256 sequence,
        uint64 observedAt,
        bytes32 evidenceHash,
        string calldata evidenceURI,
        bytes calldata signature
    ) external {
        Reservation storage reservation = _reservation(reservationId);
        if (reservation.status != ReservationStatus.Active) revert InvalidState();
        if (sequence != _checkpoints[reservationId].length + 1) revert InvalidSequence();
        if (observedAt < reservation.serviceStart || observedAt > reservation.serviceEnd) {
            revert CheckpointOutsideServiceWindow();
        }
        if (observedAt > block.timestamp) revert CheckpointInFuture();
        if (block.timestamp > uint256(reservation.serviceEnd) + gracePeriod) revert CheckpointDeadlinePassed();
        if (evidenceHash == bytes32(0) || bytes(evidenceURI).length == 0) revert InvalidEvidence();
        if (bytes(evidenceURI).length > 256) revert FieldTooLong("evidenceURI");

        Checkpoint[] storage checkpoints = _checkpoints[reservationId];
        if (checkpoints.length > 0 && observedAt <= checkpoints[checkpoints.length - 1].observedAt) {
            revert CheckpointOutOfOrder();
        }

        bytes32 digest = checkpointDigest(reservationId, sequence, observedAt, evidenceHash, evidenceURI);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != attestor) revert InvalidSignature();

        checkpoints.push(
            Checkpoint({
                attestor: recovered,
                submitter: msg.sender,
                observedAt: observedAt,
                submittedAt: uint64(block.timestamp),
                evidenceHash: evidenceHash,
                evidenceURI: evidenceURI
            })
        );

        emit CheckpointSubmitted(
            reservationId,
            recovered,
            msg.sender,
            sequence,
            observedAt,
            uint64(block.timestamp),
            evidenceHash,
            evidenceURI
        );
    }

    function checkpointDigest(
        uint256 reservationId,
        uint256 sequence,
        uint64 observedAt,
        bytes32 evidenceHash,
        string calldata evidenceURI
    ) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    CHECKPOINT_TYPEHASH,
                    reservationId,
                    sequence,
                    observedAt,
                    evidenceHash,
                    keccak256(bytes(evidenceURI))
                )
            )
        );
    }

    function markFulfilled(uint256 reservationId) external {
        Reservation storage reservation = _reservation(reservationId);
        if (reservation.status != ReservationStatus.Active) revert InvalidState();
        if (block.timestamp < reservation.serviceEnd) revert ServiceWindowOpen();
        if (_checkpoints[reservationId].length < reservation.requiredCheckpoints) revert CheckpointsIncomplete();

        _settle(reservation, 10_000, "", bytes32(0));
        reservation.status = ReservationStatus.Fulfilled;
        emit ReservationFulfilled(reservationId, reservation.provider, reservation.bondAmount, reservation.resolvedAt);

    }

    function markClaimable(uint256 reservationId) external {
        Reservation storage reservation = _reservation(reservationId);
        if (reservation.status != ReservationStatus.Active) revert InvalidState();
        if (_checkpoints[reservationId].length >= reservation.requiredCheckpoints) revert CheckpointsComplete();

        uint64 claimOpensAt = reservation.serviceEnd + gracePeriod;
        if (block.timestamp < claimOpensAt) revert GracePeriodNotElapsed();
        uint64 claimDeadline = claimOpensAt + reservation.claimWindow;
        if (block.timestamp > claimDeadline) revert ClaimWindowClosed();

        reservation.claimDeadline = claimDeadline;
        reservation.status = ReservationStatus.Claimable;
        emit ReservationClaimable(
            reservationId,
            _checkpoints[reservationId].length,
            reservation.requiredCheckpoints,
            claimDeadline
        );
    }

    function openDispute(
        uint256 reservationId,
        string calldata statementURI,
        bytes32 statementHash
    ) external {
        Reservation storage reservation = _reservation(reservationId);
        if (reservation.status != ReservationStatus.Claimable) revert InvalidState();
        if (msg.sender != reservation.buyer) revert NotBuyer();
        if (block.timestamp > reservation.claimDeadline) revert ClaimWindowClosed();
        if (statementHash == bytes32(0) || bytes(statementURI).length == 0) revert InvalidEvidence();
        if (bytes(statementURI).length > 256) revert FieldTooLong("statementURI");

        reservation.buyerStatementURI = statementURI;
        reservation.buyerStatementHash = statementHash;
        reservation.status = ReservationStatus.Disputed;
        emit DisputeOpened(reservationId, msg.sender, statementURI, statementHash);
    }

    function resolveDispute(
        uint256 reservationId,
        uint16 providerAwardBps,
        string calldata resolutionURI,
        bytes32 resolutionHash
    ) external {
        Reservation storage reservation = _reservation(reservationId);
        if (msg.sender != resolver) revert NotResolver();
        if (reservation.status != ReservationStatus.Disputed) revert InvalidState();
        if (providerAwardBps > 10_000) revert InvalidSplit();
        if (resolutionHash == bytes32(0) || bytes(resolutionURI).length == 0) revert InvalidEvidence();
        if (bytes(resolutionURI).length > 256) revert FieldTooLong("resolutionURI");

        _settle(reservation, providerAwardBps, resolutionURI, resolutionHash);

        uint256 providerAmount = (reservation.bondAmount * providerAwardBps) / 10_000;
        emit DisputeResolved(
            reservationId,
            msg.sender,
            providerAwardBps,
            providerAmount,
            reservation.bondAmount - providerAmount,
            resolutionURI,
            resolutionHash
        );
    }

    /// @notice After the claim window closes, release an undisputed missed-checkpoint bond back to the provider.
    function releaseUndisputed(uint256 reservationId) external {
        Reservation storage reservation = _reservation(reservationId);
        if (reservation.status == ReservationStatus.Active) {
            if (_checkpoints[reservationId].length >= reservation.requiredCheckpoints) revert CheckpointsComplete();
            uint64 claimDeadline = reservation.serviceEnd + gracePeriod + reservation.claimWindow;
            if (block.timestamp <= claimDeadline) revert ClaimWindowNotClosed();
            reservation.claimDeadline = claimDeadline;
        } else if (reservation.status == ReservationStatus.Claimable) {
            if (block.timestamp <= reservation.claimDeadline) revert ClaimWindowNotClosed();
        } else {
            revert InvalidState();
        }

        _settle(reservation, 10_000, "", bytes32(0));
        emit ReservationReleased(reservationId, reservation.provider, reservation.bondAmount, reservation.resolvedAt);
    }

    function expireReservation(uint256 reservationId) external {
        Reservation storage reservation = _reservation(reservationId);
        if (reservation.status != ReservationStatus.Draft && reservation.status != ReservationStatus.Funded) {
            revert InvalidState();
        }
        if (block.timestamp <= reservation.acceptanceDeadline) revert AcceptanceDeadlineNotReached();

        bool funded = reservation.status == ReservationStatus.Funded;
        uint256 refund = funded ? reservation.bondAmount : 0;
        reservation.status = ReservationStatus.Expired;
        reservation.resolvedAt = uint64(block.timestamp);
        if (funded) {
            _credit(reservation.provider, refund);
        }
        emit ReservationExpired(reservationId, reservation.provider, refund);
    }

    function withdraw() external nonReentrant {
        uint256 amount = _withdrawable[msg.sender];
        if (amount == 0) revert NoWithdrawableBalance();

        _withdrawable[msg.sender] = 0;
        totalWithdrawable -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit Withdrawal(msg.sender, msg.sender, amount);
    }

    function setAttestor(address newAttestor) external onlyOwner {
        if (newAttestor == address(0)) revert ZeroAddress();
        if (newAttestor == resolver) revert InvalidRoleSeparation();
        address previous = attestor;
        attestor = newAttestor;
        emit AttestorChanged(previous, newAttestor);
    }

    function setResolver(address newResolver) external onlyOwner {
        if (newResolver == address(0)) revert ZeroAddress();
        if (newResolver == attestor) revert InvalidRoleSeparation();
        address previous = resolver;
        resolver = newResolver;
        emit ResolverChanged(previous, newResolver);
    }

    function setGracePeriod(uint64 newGracePeriod) external onlyOwner {
        _validateGracePeriod(newGracePeriod);
        uint64 previous = gracePeriod;
        gracePeriod = newGracePeriod;
        emit GracePeriodChanged(previous, newGracePeriod);
    }

    function getReservation(uint256 reservationId) external view returns (Reservation memory) {
        return _reservations[reservationId];
    }

    function getCheckpoints(uint256 reservationId) external view returns (Checkpoint[] memory) {
        return _checkpoints[reservationId];
    }

    function checkpointCount(uint256 reservationId) external view returns (uint256) {
        return _checkpoints[reservationId].length;
    }

    function withdrawable(address account) external view returns (uint256) {
        return _withdrawable[account];
    }

    function reservationClaimDeadline(uint256 reservationId) external view returns (uint64) {
        Reservation storage reservation = _reservations[reservationId];
        if (reservation.claimDeadline != 0) return reservation.claimDeadline;
        if (reservation.serviceEnd == 0) return 0;
        return uint64(reservation.serviceEnd) + gracePeriod + uint64(reservation.claimWindow);
    }

    function vaultAccounting()
        external
        view
        returns (uint256 balance, uint256 locked, uint256 withdrawableTotal, uint256 surplus)
    {
        balance = address(this).balance;
        locked = lockedCollateral;
        withdrawableTotal = totalWithdrawable;
        surplus = balance > locked + withdrawableTotal ? balance - locked - withdrawableTotal : 0;
    }

    function _reservation(uint256 reservationId) internal view returns (Reservation storage reservation) {
        reservation = _reservations[reservationId];
        if (reservation.id == 0) revert InvalidState();
    }

    function _settle(
        Reservation storage reservation,
        uint16 providerAwardBps,
        string memory resolutionURI,
        bytes32 resolutionHash
    ) internal {
        uint256 bond = reservation.bondAmount;
        uint256 providerAmount = (bond * providerAwardBps) / 10_000;
        uint256 buyerAmount = bond - providerAmount;

        reservation.status = ReservationStatus.Resolved;
        reservation.resolvedAt = uint64(block.timestamp);
        reservation.providerAwardBps = providerAwardBps;
        reservation.resolutionURI = resolutionURI;
        reservation.resolutionHash = resolutionHash;

        lockedCollateral -= bond;
        totalWithdrawable += bond;
        if (providerAmount > 0) _withdrawable[reservation.provider] += providerAmount;
        if (buyerAmount > 0) _withdrawable[reservation.buyer] += buyerAmount;
    }

    function _credit(address account, uint256 amount) internal {
        lockedCollateral -= amount;
        totalWithdrawable += amount;
        _withdrawable[account] += amount;
    }

    function _validateProviderFields(
        string calldata name,
        string calldata contact,
        string calldata metadataURI
    ) internal pure {
        if (bytes(name).length == 0) revert EmptyField("name");
        if (bytes(name).length > 80) revert FieldTooLong("name");
        if (bytes(contact).length == 0) revert EmptyField("contact");
        if (bytes(contact).length > 160) revert FieldTooLong("contact");
        if (bytes(metadataURI).length > 256) revert FieldTooLong("metadataURI");
    }

    function _validateGracePeriod(uint64 value) internal pure {
        if (value < MIN_GRACE_PERIOD || value > MAX_GRACE_PERIOD) revert InvalidGracePeriod();
    }
}
