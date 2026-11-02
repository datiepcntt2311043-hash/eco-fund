// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Trong Remix, import này tự tải OpenZeppelin từ npm, không cần cài gì thêm.
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/*
 * ECO-FUND: Nen tang gay quy minh bach cho du an moi truong.
 *
 * Gom 2 contract:
 *  - CampaignFactory: admin duyet nguoi tao chien dich (whitelist) va tao tung Campaign doc lap.
 *  - Campaign: quan ly tien cua MOT chien dich (donate, refund, giai ngan theo milestone).
 *
 * State machine:
 *  Active -> Successful (du muc tieu truoc han) -> Completed (rut het cac milestone)
 *  Active -> Failed (het han, chua du)          -> Refunded (donor goi refund)
 */

/* ============================================================
 *                         CAMPAIGN
 * ============================================================ */
contract Campaign is ReentrancyGuard {
    // ---------- Kieu du lieu ----------
    enum State { Active, Successful, Failed, Completed, Refunded }

    struct Milestone {
        uint8 percent;          // % tong tien duoc rut khi milestone nay duoc duyet
        string proofHash;       // hash/CID IPFS cua bang chung (chi luu hash tren chain)
        bool proofSubmitted;    // owner da nop bang chung chua
        bool approved;          // verifier da duyet chua
        bool withdrawn;         // owner da rut chua
    }

    // ---------- Bien trang thai ----------
    address public immutable owner;     // nguoi thuc hien chien dich
    address public immutable verifier;  // nguoi xac nhan milestone (admin cua Factory)
    string public name;
    string public description;
    uint256 public immutable goal;      // muc tieu (wei)
    uint256 public immutable deadline;  // han chot (timestamp, giay)

    uint256 public totalRaised;         // tong tien da gop (khong doi khi rut)
    State public state;

    mapping(address => uint256) public donations; // so tien moi donor da gop
    Milestone[] private milestones;

    // ---------- Event ----------
    event Donated(address indexed donor, uint256 amount, uint256 totalRaised);
    event GoalReached(uint256 totalRaised);
    event CampaignFailed(uint256 totalRaised);
    event Refunded(address indexed donor, uint256 amount);
    event ProofSubmitted(uint256 indexed index, string proofHash);
    event MilestoneApproved(uint256 indexed index, address indexed verifier);
    event Withdrawn(uint256 indexed index, address indexed owner, uint256 amount);
    event CampaignCompleted();

    // ---------- Modifier kiem tra quyen ----------
    modifier onlyOwner() {
        require(msg.sender == owner, "Chi owner duoc goi");
        _;
    }

    modifier onlyVerifier() {
        require(msg.sender == verifier, "Chi verifier duoc goi");
        _;
    }

    constructor(
        address _owner,
        address _verifier,
        string memory _name,
        string memory _description,
        uint256 _goal,
        uint256 _deadline,
        uint8[] memory _percents
    ) {
        require(_owner != address(0) && _verifier != address(0), "Dia chi khong hop le");
        require(_goal > 0, "Muc tieu phai > 0");
        require(_deadline > block.timestamp, "Han chot phai o tuong lai");
        require(_percents.length >= 2 && _percents.length <= 3, "Can 2-3 milestone");

        uint256 sum;
        for (uint256 i = 0; i < _percents.length; i++) {
            require(_percents[i] > 0, "Moi milestone phai > 0%");
            sum += _percents[i];
            milestones.push(Milestone(_percents[i], "", false, false, false));
        }
        require(sum == 100, "Tong % milestone phai bang 100");

        owner = _owner;
        verifier = _verifier;
        name = _name;
        description = _description;
        goal = _goal;
        deadline = _deadline;
        state = State.Active;
    }

    // ---------- State machine ----------

    // Trang thai "that" tai thoi diem hien tai (Active nhung qua han => Failed).
    function currentState() public view returns (State) {
        if (state == State.Active && block.timestamp > deadline) {
            return State.Failed;
        }
        return state;
    }

    // Ghi trang thai Failed len chain khi can.
    function _syncState() internal {
        if (state == State.Active && block.timestamp > deadline) {
            state = State.Failed;
            emit CampaignFailed(totalRaised);
        }
    }

    // ---------- Donor ----------

    function donate() external payable {
        require(state == State.Active, "Chien dich khong con nhan donate");
        require(block.timestamp <= deadline, "Da het han");
        require(msg.value > 0, "So tien phai > 0");

        donations[msg.sender] += msg.value;
        totalRaised += msg.value;
        emit Donated(msg.sender, msg.value, totalRaised);

        if (totalRaised >= goal) {
            state = State.Successful;
            emit GoalReached(totalRaised);
        }
    }

    // Pull payment: donor tu rut tien cua minh, contract khong tu gui di.
    function refund() external nonReentrant {
        _syncState();
        require(
            state == State.Failed || state == State.Refunded,
            "Chua du dieu kien hoan tien"
        );

        uint256 amount = donations[msg.sender];
        require(amount > 0, "Ban khong co tien de hoan");

        // Effects truoc, Interactions sau (chong reentrancy)
        donations[msg.sender] = 0;
        state = State.Refunded;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Hoan tien that bai");

        emit Refunded(msg.sender, amount);
    }

    // ---------- Milestone ----------

    // Owner nop bang chung (hash IPFS). Phai lam tuan tu: milestone truoc da rut xong.
    function submitProof(uint256 index, string calldata proofHash) external onlyOwner {
        require(state == State.Successful, "Chien dich chua thanh cong");
        require(index < milestones.length, "Milestone khong ton tai");
        require(bytes(proofHash).length > 0, "Hash rong");
        require(index == 0 || milestones[index - 1].withdrawn, "Phai hoan thanh milestone truoc");

        Milestone storage m = milestones[index];
        require(!m.approved, "Milestone da duoc duyet");

        m.proofHash = proofHash;
        m.proofSubmitted = true;
        emit ProofSubmitted(index, proofHash);
    }

    // Verifier xac nhan sau khi kiem tra bang chung.
    function approveMilestone(uint256 index) external onlyVerifier {
        require(state == State.Successful, "Chien dich chua thanh cong");
        require(index < milestones.length, "Milestone khong ton tai");

        Milestone storage m = milestones[index];
        require(m.proofSubmitted, "Chua co bang chung");
        require(!m.approved, "Da duyet roi");

        m.approved = true;
        emit MilestoneApproved(index, msg.sender);
    }

    // Owner rut tien cua milestone da duoc duyet (pull payment).
    function withdrawMilestone(uint256 index) external onlyOwner nonReentrant {
        require(state == State.Successful, "Chien dich khong o trang thai giai ngan");
        require(index < milestones.length, "Milestone khong ton tai");
        require(index == 0 || milestones[index - 1].withdrawn, "Phai rut milestone truoc");

        Milestone storage m = milestones[index];
        require(m.approved, "Milestone chua duoc duyet");
        require(!m.withdrawn, "Da rut roi");

        // Milestone cuoi nhan toan bo so du con lai de khong bi sot tien le
        uint256 amount;
        if (index == milestones.length - 1) {
            amount = address(this).balance;
        } else {
            amount = (totalRaised * m.percent) / 100;
        }

        // Effects
        m.withdrawn = true;
        if (index == milestones.length - 1) {
            state = State.Completed;
        }

        // Interaction
        (bool ok, ) = payable(owner).call{value: amount}("");
        require(ok, "Rut tien that bai");

        emit Withdrawn(index, owner, amount);
        if (state == State.Completed) {
            emit CampaignCompleted();
        }
    }

    // ---------- Ham doc (view) ----------

    function getCampaignInfo()
        external
        view
        returns (
            string memory _name,
            string memory _description,
            address _owner,
            address _verifier,
            uint256 _goal,
            uint256 _deadline,
            uint256 _totalRaised,
            uint256 _balance,
            State _state,
            uint256 _milestoneCount
        )
    {
        return (
            name,
            description,
            owner,
            verifier,
            goal,
            deadline,
            totalRaised,
            address(this).balance,
            currentState(),
            milestones.length
        );
    }

    function getMilestone(uint256 index)
        external
        view
        returns (
            uint8 percent,
            string memory proofHash,
            bool proofSubmitted,
            bool approved,
            bool withdrawn
        )
    {
        require(index < milestones.length, "Milestone khong ton tai");
        Milestone storage m = milestones[index];
        return (m.percent, m.proofHash, m.proofSubmitted, m.approved, m.withdrawn);
    }
}

/* ============================================================
 *                      CAMPAIGN FACTORY
 * ============================================================ */
contract CampaignFactory {
    address public immutable admin;              // admin kiem verifier
    mapping(address => bool) public approvedOwners; // whitelist nguoi tao chien dich
    address[] private campaigns;

    event OwnerApproved(address indexed owner);
    event CampaignCreated(
        address indexed campaign,
        address indexed owner,
        string name,
        uint256 goal,
        uint256 deadline
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Chi admin duoc goi");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // Admin duyet (whitelist) mot dia chi duoc phep tao chien dich
    function approveOwner(address _owner) external onlyAdmin {
        require(_owner != address(0), "Dia chi khong hop le");
        require(_owner != admin, "Admin khong duoc la owner (tranh xung dot loi ich)");
        approvedOwners[_owner] = true;
        emit OwnerApproved(_owner);
    }

    // _durationSeconds: thoi gian song cua chien dich tinh tu bay gio (de test cho de).
    // _percents: vi du [30,70] hoac [30,30,40]; tong phai = 100.
    function createCampaign(
        string calldata _name,
        string calldata _description,
        uint256 _goal,
        uint256 _durationSeconds,
        uint8[] calldata _percents
    ) external returns (address) {
        require(approvedOwners[msg.sender], "Ban chua duoc admin duyet");

        uint256 _deadline = block.timestamp + _durationSeconds;
        Campaign c = new Campaign(
            msg.sender,
            admin,
            _name,
            _description,
            _goal,
            _deadline,
            _percents
        );

        campaigns.push(address(c));
        emit CampaignCreated(address(c), msg.sender, _name, _goal, _deadline);
        return address(c);
    }

    function getCampaigns() external view returns (address[] memory) {
        return campaigns;
    }

    function campaignCount() external view returns (uint256) {
        return campaigns.length;
    }
}
