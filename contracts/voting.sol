// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title Voting with delegation.
contract Ballot {
    struct Voter {
        uint weight; // weight is accumulated by delegation
        mapping(uint32 => bool) votedForProposal; // proposals which this voter has voted for/against
    }

    // This is a type for a single proposal.
    // Example of proposal: Remove X person from Gnosis Safe
    struct Proposal {
        bytes32 name; // e.g. Add X person to safe (in bytecode)
        address owner; // address of account to add or remove from safe
        bool add;
        bool remove;
        uint votesFor;
        uint votesAgainst;
    }

    address public chairperson; // arbitary. this person will add voters at the beginning. 

    mapping(address => Voter) public voters;

    Proposal[] public allProposals;

    constructor(Proposal[] memory proposals) { // assumes no errors encoding
        for(uint i=0; i<proposals.length; i++) {
            require(
                (proposals[i].add && !proposals[i].remove || !proposals[i].add && proposals[i].remove),
                "A proposal can be submitted to add or remove someone, not both actions simultaneously."
            );
        }

        chairperson = msg.sender;
        voters[chairperson].weight = 1;

        for(uint i=0; i<proposals.length; i++) {
            allProposals.push(proposals[i]);
        }
    }

    function giveRightToVote(address voter, uint weight) public { // weight passed in, based on pool stake
        require(
            msg.sender == chairperson,
            "Only chairperson can give right to vote."
        );
        require(voters[voter].weight == 0);
        voters[voter].weight = weight;
    }

    function vote(uint32 proposal, bool forOrAgainst) public { // forOrAgainst: for = true, against = false
        Voter storage sender = voters[msg.sender];
        require(sender.weight != 0, "Has no right to vote");
        require(!sender.votedForProposal[proposal], "Already voted for this proposal.");
        sender.votedForProposal[proposal] = true;

        // If `proposal` is out of the range of the array,
        // this will throw automatically and revert all
        // changes.
        if (forOrAgainst == true) {
            allProposals[proposal].votesFor += sender.weight;
        } else {
            allProposals[proposal].votesAgainst += sender.weight;
        }
    }

    function winningProposals() public view
            returns (bytes32[] memory)
    {
        bytes32[] memory winningProps;
        for (uint p = 0; p < allProposals.length; p++) {
            uint count = 0;
            if (allProposals[p].votesFor > allProposals[p].votesAgainst) {
                winningProps[count] = allProposals[p].name;
                count += 1;
            }
        }
        return winningProps;
    }
}
