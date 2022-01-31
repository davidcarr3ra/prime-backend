pragma solidity ^0.8.0;

interface IBalancerPool {
    function totalSupply() external view returns (uint);
    function balanceOf(address whom) external view returns (uint);
}