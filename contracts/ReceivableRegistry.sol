// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Educational project for the course Introduction to Finance.
 * Not a real product, service or investment offer.
 *
 * ReceivableRegistry keeps ONE record per invoice (identified by a hash)
 * and refuses to give the same invoice to two financiers.
 * Only the hash, the status and the addresses are stored here.
 * Documents, names and amounts stay off-chain.
 */
contract ReceivableRegistry {
    enum Status { None, Registered, Assigned, Settled, Disputed, Expired }

    struct Receivable {
        address supplier;   // who registered the invoice
        address financier;  // who financed it (zero address if nobody)
        Status status;
        uint64 dueDate;     // unix time, set by the supplier
    }

    address public admin;                        // FactorChain operator
    mapping(address => bool) public isFinancier; // approved financiers
    mapping(bytes32 => Receivable) private receivables;

    event FinancierAdded(address indexed financier);
    event Registered(bytes32 indexed id, address indexed supplier);
    event Assigned(bytes32 indexed id, address indexed financier);
    event Settled(bytes32 indexed id);
    event Released(bytes32 indexed id);
    event Disputed(bytes32 indexed id, address indexed by);
    event Expired(bytes32 indexed id);

    constructor() {
        admin = msg.sender;
    }

    // --- Role: admin ---------------------------------------------------

    function addFinancier(address financier) external {
        require(msg.sender == admin, "Not admin");
        isFinancier[financier] = true;
        emit FinancierAdded(financier);
    }

    // --- Role: supplier ------------------------------------------------

    function registerReceivable(bytes32 id, uint64 dueDate) external {
        require(receivables[id].status == Status.None, "Already registered");
        receivables[id] = Receivable(msg.sender, address(0), Status.Registered, dueDate);
        emit Registered(id, msg.sender);
    }

    // --- Anyone can read -----------------------------------------------

    function checkStatus(bytes32 id) external view returns (Status) {
        return receivables[id].status;
    }

    function getReceivable(bytes32 id)
        external
        view
        returns (address supplier, address financier, Status status, uint64 dueDate)
    {
        Receivable storage r = receivables[id];
        return (r.supplier, r.financier, r.status, r.dueDate);
    }

    // --- Role: financier -----------------------------------------------

    // The key rule: only a "Registered" invoice can be assigned.
    // The check and the status change happen in ONE transaction,
    // so two financiers cannot both succeed.
    function assignReceivable(bytes32 id) external {
        require(isFinancier[msg.sender], "Not a financier");
        Receivable storage r = receivables[id];
        require(r.status == Status.Registered, "Not available");
        r.status = Status.Assigned;
        r.financier = msg.sender;
        emit Assigned(id, msg.sender);
    }

    function confirmSettlement(bytes32 id) external {
        Receivable storage r = receivables[id];
        require(r.status == Status.Assigned, "Not assigned");
        require(msg.sender == r.financier, "Not the assigned financier");
        r.status = Status.Settled;
        emit Settled(id);
    }

    function releaseAssignment(bytes32 id) external {
        Receivable storage r = receivables[id];
        require(r.status == Status.Assigned, "Not assigned");
        require(msg.sender == r.financier, "Not the assigned financier");
        r.status = Status.Registered;
        r.financier = address(0);
        emit Released(id);
    }

    // --- Supplier or assigned financier --------------------------------

    function openDispute(bytes32 id) external {
        Receivable storage r = receivables[id];
        require(
            r.status == Status.Registered || r.status == Status.Assigned,
            "Cannot dispute"
        );
        require(msg.sender == r.supplier || msg.sender == r.financier, "Not a party");
        r.status = Status.Disputed;
        emit Disputed(id, msg.sender);
    }

    // --- Anyone, after the deadline ------------------------------------

    // Closes an invoice nobody financed, 30 days after its due date.
    function expireReceivable(bytes32 id) external {
        Receivable storage r = receivables[id];
        require(r.status == Status.Registered, "Not registered");
        require(block.timestamp > uint256(r.dueDate) + 30 days, "Not expired yet");
        r.status = Status.Expired;
        emit Expired(id);
    }
}
