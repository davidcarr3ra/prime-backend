require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: "0.8.4",
};

module.exports = {
solidity: "0.8.4",
paths: {
artifacts: './src/artifacts',
},
networks: {
hardhat: {
},
rinkeby: {
url: "https://rinkeby.infura.io/v3/d019cd7ba3cc442884b428568076f4ad",
accounts: [`0x${process.env.REACT_APP_PRIVATE_KEY}`]
}
}
};
