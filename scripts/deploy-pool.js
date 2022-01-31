const hre = require("hardhat");
const ethers = require("ethers");

const balancer = async () => {
  // addresses taken from: https://docs.balancer.fi/v/v1/smart-contracts/addresses
  const bfactory = '0x9C84391B443ea3a48788079a5f98e2EaD55c9309'

  const balancerSafeMath = '0x0F811b1AF2B6B447B008eFF31eCceeE5A0b1d842'
  const rightsManager = '0x4aCB6685da2B5FcB29b1614E71825CE67464440b'
  const smartPoolManager = '0xb3a3f6826281525dd57f7BA837235E4Fa71C6248'

  await CRPFactory.link("BalancerSafeMath", balancerSafeMath);
  await CRPFactory.link("RightsManager", rightsManager);
  await CRPFactory.link("SmartPoolManager", smartPoolManager);

  const crpFactory = await CRPFactory.new();

  const usdc = await setup.tokens.erc20s[1];
  const dai = await setup.tokens.erc20s[0];
  const primetoken = await setup.tokens.primeToken;
  const usdt = await setup.tokens.erc20s[2];

  const USDC = await usdc.address;
  const DAI = await dai.address;
  const PRIMEToken = await primetoken.address;

  const tokenAddresses = [PRIMEToken, DAI, USDC];

  const swapFee = 10 ** 15;
  const startWeights = [toWei('8'), toWei('1'), toWei('1')];
  const startBalances = [toWei('10000'), toWei('5000'), toWei('5000')];
  const SYMBOL = 'BPOOL';
  const NAME = 'Prime Balancer Pool Token';

  const permissions = {
      canPauseSwapping: true,
      canChangeSwapFee: true,
      canChangeWeights: true,
      canAddRemoveTokens: true,
      canWhitelistLPs: false,
  };

  const poolParams = {
      poolTokenSymbol: SYMBOL,
      poolTokenName: NAME,
      constituentTokens: tokenAddresses,
      tokenBalances: startBalances,
      tokenWeights: startWeights,
      swapFee: swapFee,
  };

  POOL = await crpFactory.newCrp.call(
      bfactory.address,
      poolParams,
      permissions,
  );

  await crpFactory.newCrp(
      bfactory.address,
      poolParams,
      permissions,
  );

  const pool = await ConfigurableRightsPool.at(POOL);

  await usdc.approve(POOL, MAX);
  await dai.approve(POOL, MAX);
  await primetoken.approve(POOL, MAX);

  await pool.createPool(toWei('1000'), 10, 10);

  // move ownership to avatar
  await pool.setController(setup.organization.avatar.address);

  // deploy proxy
  const proxy = await BalancerProxy.new();
  // initialize proxy
  await proxy.initialize(setup.organization.avatar.address, pool.address, await pool.bPool());

  return { pool, proxy };
}

async function main() {
    // Contracts
    const VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';
    const WEIGHTED_POOL_FACTORY = '0x8E9aa87E45e92bad84D5F8DD1bff34Fb92637dE9';
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    // Tokens -- MUST be sorted numerically
    const MKR = '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2';
    const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    const tokens = [MKR, WETH, USDT];

    // Pool arguments
    const NAME = 'Three-token Test Pool';
    const SYMBOL = '70MKR-15WETH-15USDT';
    const swapFeePercentage = 0.005e18; // 0.5%
    const weights = [0.7e18, 0.15e18, 0.15e18];

    // Create pool in factory

    const factory = await ethers.getContractAt('WeightedPoolFactory',
                                               WEIGHTED_POOL_FACTORY);

    // If you're creating a different type of pool, look up the create 
    // function for your corresponding pool in that pool factory's ABI
    const tx = await factory.create(NAME, SYMBOL, tokens, weights,
                                    swapFeePercentage, ZERO_ADDRESS);
    const receipt = await tx.wait();

    // We need to get the new pool address out of the PoolCreated event
    const events = receipt.events.filter((e) => e.event === 'PoolCreated');
    const poolAddress = events[0].args.pool;

    // We're going to need the PoolId later, so ask the contract for it
    const pool = await ethers.getContractAt('WeightedPool', poolAddress);
    const poolId = await pool.getPoolId();

    // Lets add tokens to this new pool
    const vault = await ethers.getContractAt('Vault', VAULT);

    // Tokens must be in the same order
    // Values must be decimal-normalized! (USDT has 6 decimals)
    const initialBalances = [16.667e18, 3.5714e18, 7500e6];

    // Need to approve the Vault to transfer the tokens!
    // Can do through Etherscan, or programmatically
    for (var i in tokens) {
      const tokenContract = await ethers.getContractAt('ERC20', tokens[i]);
      await tokenContract.approve(VAULT, initialBalances[i]);
    }


    // Construct userData
    const JOIN_KIND_INIT = 0;
    const initUserData =
        ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256[]'], 
                                            [JOIN_KIND_INIT, initialBalances]);

    const joinPoolRequest = {
      assets: tokens,
      maxAmountsIn: initialBalances,
      userData: initUserData,
      fromInternalBalance: false
    } 

    // define caller as the address you're calling from
    caller = '0xC6c9d98dDfCE646B7bA2357504607484321F6d3A'
    // joins are done on the Vault
    const tx = await vault.joinPool(poolId, caller, caller, joinPoolRequest);

    // You can wait for it like this, or just print the tx hash and monitor
    const receipt = await tx.wait();

    console.log(poolId);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
