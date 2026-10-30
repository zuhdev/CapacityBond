// Generated from the compiled contract after deployment. Do not edit by hand.
export const capacityBondAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "initialOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "initialAttestor",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "initialResolver",
        "type": "address"
      },
      {
        "internalType": "uint64",
        "name": "initialGracePeriod",
        "type": "uint64"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AcceptanceDeadlineNotReached",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AcceptanceDeadlinePassed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadyAccepted",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BuyerIsProvider",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CheckpointDeadlinePassed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CheckpointInFuture",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CheckpointOutOfOrder",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CheckpointOutsideServiceWindow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CheckpointsComplete",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CheckpointsIncomplete",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ClaimWindowClosed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ClaimWindowNotClosed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ECDSAInvalidSignature",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "length",
        "type": "uint256"
      }
    ],
    "name": "ECDSAInvalidSignatureLength",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "ECDSAInvalidSignatureS",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "field",
        "type": "string"
      }
    ],
    "name": "EmptyField",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "field",
        "type": "string"
      }
    ],
    "name": "FieldTooLong",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "GracePeriodNotElapsed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "IncorrectBond",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidAcceptanceDeadline",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidAgreementReference",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidBondAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidCheckpointInterval",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidClaimWindow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidEvidence",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidGracePeriod",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRoleSeparation",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSequence",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidServiceWindow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidShortString",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSignature",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSplit",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidState",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoWithdrawableBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotBuyer",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotResolver",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ServiceWindowOpen",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "str",
        "type": "string"
      }
    ],
    "name": "StringTooLong",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TooManyCheckpoints",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Unauthorized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousAttestor",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newAttestor",
        "type": "address"
      }
    ],
    "name": "AttestorChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "provider",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "BondDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "attestor",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "submitter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "sequence",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "observedAt",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "submittedAt",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "evidenceHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "evidenceURI",
        "type": "string"
      }
    ],
    "name": "CheckpointSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "statementURI",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "statementHash",
        "type": "bytes32"
      }
    ],
    "name": "DisputeOpened",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "resolver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "providerAwardBps",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "providerAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "buyerAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "resolutionURI",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "resolutionHash",
        "type": "bytes32"
      }
    ],
    "name": "DisputeResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "EIP712DomainChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "previousGracePeriod",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "newGracePeriod",
        "type": "uint64"
      }
    ],
    "name": "GracePeriodChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "provider",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "contact",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "metadataURI",
        "type": "string"
      }
    ],
    "name": "ProviderRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "provider",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "contact",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "metadataURI",
        "type": "string"
      }
    ],
    "name": "ProviderUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "activatedAt",
        "type": "uint64"
      }
    ],
    "name": "ReservationActivated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "checkpointsObserved",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "checkpointsRequired",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "claimDeadline",
        "type": "uint64"
      }
    ],
    "name": "ReservationClaimable",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "provider",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "agreementHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "agreementURI",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "bondAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "serviceStart",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "serviceEnd",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "acceptanceDeadline",
        "type": "uint64"
      }
    ],
    "name": "ReservationCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "provider",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "refundedAmount",
        "type": "uint256"
      }
    ],
    "name": "ReservationExpired",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "provider",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "resolvedAt",
        "type": "uint64"
      }
    ],
    "name": "ReservationFulfilled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "provider",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "resolvedAt",
        "type": "uint64"
      }
    ],
    "name": "ReservationReleased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousResolver",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newResolver",
        "type": "address"
      }
    ],
    "name": "ResolverChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "party",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "providerAccepted",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "buyerAccepted",
        "type": "bool"
      }
    ],
    "name": "TermsAccepted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "Withdrawal",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_CHECKPOINTS",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_CLAIM_WINDOW",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_GRACE_PERIOD",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_SERVICE_DURATION",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_CHECKPOINT_INTERVAL",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_CLAIM_WINDOW",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_GRACE_PERIOD",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "POLICY_VERSION",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "acceptOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      }
    ],
    "name": "acceptReservation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "attestor",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      }
    ],
    "name": "checkpointCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "sequence",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "observedAt",
        "type": "uint64"
      },
      {
        "internalType": "bytes32",
        "name": "evidenceHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "evidenceURI",
        "type": "string"
      }
    ],
    "name": "checkpointDigest",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "bondAmount",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "agreementHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "agreementURI",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "capacity",
        "type": "string"
      },
      {
        "internalType": "uint64",
        "name": "serviceStart",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "serviceEnd",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "acceptanceDeadline",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "claimWindow",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "checkpointInterval",
        "type": "uint64"
      }
    ],
    "name": "createReservation",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      }
    ],
    "name": "depositBond",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "eip712Domain",
    "outputs": [
      {
        "internalType": "bytes1",
        "name": "fields",
        "type": "bytes1"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "version",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "chainId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "verifyingContract",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "salt",
        "type": "bytes32"
      },
      {
        "internalType": "uint256[]",
        "name": "extensions",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      }
    ],
    "name": "expireReservation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      }
    ],
    "name": "getCheckpoints",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "attestor",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "submitter",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "observedAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "submittedAt",
            "type": "uint64"
          },
          {
            "internalType": "bytes32",
            "name": "evidenceHash",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "evidenceURI",
            "type": "string"
          }
        ],
        "internalType": "struct CapacityBond.Checkpoint[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "provider",
        "type": "address"
      }
    ],
    "name": "getProvider",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "contact",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "metadataURI",
            "type": "string"
          },
          {
            "internalType": "uint64",
            "name": "registeredAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "updatedAt",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct CapacityBond.ProviderProfile",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      }
    ],
    "name": "getReservation",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "provider",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "buyer",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "agreementHash",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "agreementURI",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "capacity",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "bondAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "serviceStart",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "serviceEnd",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "acceptanceDeadline",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "claimWindow",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "checkpointInterval",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "activatedAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "fundedAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "resolvedAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "claimDeadline",
            "type": "uint64"
          },
          {
            "internalType": "uint32",
            "name": "requiredCheckpoints",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "providerAwardBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "policyVersion",
            "type": "uint16"
          },
          {
            "internalType": "bool",
            "name": "providerAccepted",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "buyerAccepted",
            "type": "bool"
          },
          {
            "internalType": "enum CapacityBond.ReservationStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "buyerStatementURI",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "buyerStatementHash",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "resolutionURI",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "resolutionHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct CapacityBond.Reservation",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gracePeriod",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "lockedCollateral",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      }
    ],
    "name": "markClaimable",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      }
    ],
    "name": "markFulfilled",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextReservationId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "statementURI",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "statementHash",
        "type": "bytes32"
      }
    ],
    "name": "openDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pendingOwner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "providerAt",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "providerCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "contact",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "metadataURI",
        "type": "string"
      }
    ],
    "name": "registerProvider",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      }
    ],
    "name": "releaseUndisputed",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      }
    ],
    "name": "reservationClaimDeadline",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "internalType": "uint16",
        "name": "providerAwardBps",
        "type": "uint16"
      },
      {
        "internalType": "string",
        "name": "resolutionURI",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "resolutionHash",
        "type": "bytes32"
      }
    ],
    "name": "resolveDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "resolver",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newAttestor",
        "type": "address"
      }
    ],
    "name": "setAttestor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "newGracePeriod",
        "type": "uint64"
      }
    ],
    "name": "setGracePeriod",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newResolver",
        "type": "address"
      }
    ],
    "name": "setResolver",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reservationId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "sequence",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "observedAt",
        "type": "uint64"
      },
      {
        "internalType": "bytes32",
        "name": "evidenceHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "evidenceURI",
        "type": "string"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "submitCheckpoint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalWithdrawable",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "contact",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "metadataURI",
        "type": "string"
      }
    ],
    "name": "updateProvider",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "vaultAccounting",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "locked",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "withdrawableTotal",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "surplus",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "withdrawable",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
