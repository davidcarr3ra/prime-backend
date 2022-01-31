// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IBalancerPool.sol";

contract Proposals {

    enum ProposalAction {ADD, REMOVE}

    struct Proposal {
        uint id;
        address ownerProposed;
        ProposalAction action;
        uint votesFor;
        uint votesAgainst;
        bool active;
    }

    struct Voter {
        uint id;
        string name;
        address acct;
        uint weight;
    }

    // Pool address: 0xc697051d1c6296c24ae3bcef39aca743861d9a81
    // Note: on mainnet, taken from https://pools.balancer.exchange/#/pool/0xc697051d1c6296c24ae3bcef39aca743861d9a81/

    IBalancerPool public balancer_pool;

    // Treat this as gnosis safe for now
    mapping(address => bool) public currentOwners; // true if owner exists, false otherwise

    mapping (uint => Voter) public voter_of_id;
    mapping (address => uint) public address_to_id;
    mapping (address => uint8) public valid_voter;
    mapping (uint => Proposal) public proposals;
    mapping (uint => mapping(address => bool)) votedForProposal;

    uint public p_counter;
    uint public v_counter;

    constructor(address pool) {
        balancer_pool = IBalancerPool(pool);
    }

    function makeVoter(address voter, string memory name) public { // for some reason failing on remix: "Called function should be payable if you send value .." 
        v_counter++;
        uint weight = getWeight(voter);
        voter_of_id[v_counter] = Voter(v_counter, name, voter, weight);
        address_to_id[voter] = v_counter;
        valid_voter[voter] = 1;
    }

    function getWeight(address voter) private view returns(uint stake) {
        stake = balancer_pool.balanceOf(voter) / balancer_pool.totalSupply();
    }

    function makeProposal(uint8 action, address ownerProposed) external {
        p_counter++;
        proposals[p_counter] = Proposal(p_counter, ownerProposed, ProposalAction(action), 0, 0, true);
    }

    function voteFor(uint proposal_id) external {
        address voter = msg.sender;
        require(valid_voter[voter] == 1, "This person is not a voter!");
        require(votedForProposal[proposal_id][voter] == false, "This person already voted for this proposal!");
        votedForProposal[proposal_id][voter] == true;
        uint weight = voter_of_id[address_to_id[voter]].weight;
        proposals[proposal_id].votesFor += weight;
    }

    function voteAgainst(uint proposal_id) external {
        address voter = msg.sender;
        require(valid_voter[voter] == 1, "This person is not a voter!");
        require(votedForProposal[proposal_id][voter] == false, "This person already voted for this proposal!");
        votedForProposal[proposal_id][voter] == true;
        uint weight = voter_of_id[address_to_id[voter]].weight;
        proposals[proposal_id].votesAgainst += weight;
    }

    function endVoting(uint proposal_id) private {
        require(proposals[proposal_id].active == true, "Proposal is no longer active.");
        
        uint action = uint(proposals[proposal_id].action);
        address ownerProposed = proposals[proposal_id].ownerProposed;
        if(action == 0) {
            if(proposals[proposal_id].votesFor > proposals[proposal_id].votesAgainst) { // remove owner from safe
                require(currentOwners[ownerProposed] == true, "Owner does not exist.");
                currentOwners[ownerProposed] = false;
            }
        } else {
            if(proposals[proposal_id].votesFor > proposals[proposal_id].votesAgainst) { // add owner to safe
                require(currentOwners[ownerProposed] == false, "Owner already in safe.");
                currentOwners[ownerProposed] = true;
            }
        }
    }
}
