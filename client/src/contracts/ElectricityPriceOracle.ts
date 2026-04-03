/**
 * ElectricityPriceOracle 合约 ABI
 * 
 * ⚠️  此文件由 scripts/sync-abi.cjs 自动生成，请勿手动修改
 * ⚠️  如需更新，请在合约仓库运行: node scripts/sync-abi.cjs
 * 
 * 生成时间: 2026-04-03T12:34:22.481Z
 * 
 * 函数列表:
//   PRICE_PRECISION() → uint256 [view]
//   RATE_PRECISION() → uint256 [view]
//   REVENUE_PRECISION() → uint256 [view]
//   c2CoinAggregator() → address [view]
//   chainlinkDataFreshnessThreshold() → uint256 [view]
//   dataFreshnessThreshold() → uint256 [view]
//   getC2CoinPriceByMonth(uint256 _month) → uint256 [view]
//   getChainlinkC2CoinPrice() → uint256 [view]
//   getChainlinkPVCoinPrice() → uint256 [view]
//   getChainlinkRMBUSDTRate() → uint256 [view]
//   getCurrentYearMonth() → uint256 [view]
//   getGenerationByMonth(uint256 _month) → uint256 [view]
//   getLatestC2CoinPrice() → uint256 [view]
//   getLatestGeneration() → uint256 [view]
//   getLatestPVCoinPrice() → uint256 [view]
//   getLatestRMBUSDTRate() → uint256 [view]
//   getLatestRevenue() → uint256 [view]
//   getLatestTimestamp() → uint256 [view]
//   getMonthlyData(uint256 _month) → tuple [view]
//   getPVCoinPriceByMonth(uint256 _month) → uint256 [view]
//   getRMBUSDTRateByMonth(uint256 _month) → uint256 [view]
//   getRevenueByMonth(uint256 _month) → uint256 [view]
//   hasMonthData(uint256 _month) → bool [view]
//   isDataFresh(uint256 _month) → bool [view]
//   lastUpdateMonth() → uint256 [view]
//   monthDataExists(uint256 ) → bool [view]
//   oracleData(uint256 ) → uint256, uint256, uint256, uint256, uint256, uint256 [view]
//   owner() → address [view]
//   pause() → void [nonpayable]
//   paused() → bool [view]
//   pvCoinAggregator() → address [view]
//   renounceOwnership() → void [nonpayable]
//   rmbUsdtAggregator() → address [view]
//   setC2CoinAggregator(address _aggregator) → void [nonpayable]
//   setChainlinkDataFreshnessThreshold(uint256 _newThreshold) → void [nonpayable]
//   setDataFreshnessThreshold(uint256 _newThreshold) → void [nonpayable]
//   setPVCoinAggregator(address _aggregator) → void [nonpayable]
//   setRMBUSDTAggregator(address _aggregator) → void [nonpayable]
//   transferOwnership(address newOwner) → void [nonpayable]
//   unpause() → void [nonpayable]
//   updateOracleData(uint256 _month, uint256 _monthlyGeneration, uint256 _monthlyRevenue) → void [nonpayable]
//   updateOracleDataManual(uint256 _month, uint256 _monthlyGeneration, uint256 _monthlyRevenue, uint256 _rmbUsdtRate, uint256 _c2CoinPrice, uint256 _pvCoinPrice) → void [nonpayable]
 * 
 * 事件列表:
//   event ChainlinkAggregatorUpdated(indexed address aggregatorType, indexed address newAggregator)
//   event ChainlinkDataFreshnessThresholdUpdated(uint256 newThreshold)
//   event DataFreshnessThresholdUpdated(uint256 newThreshold)
//   event FutureMonthRejected(indexed uint256 month, uint256 currentMonth)
//   event MonthDataAlreadyExists(indexed uint256 month)
//   event OracleDataUpdated(indexed uint256 month, uint256 generation, uint256 revenue, uint256 rmbUsdtRate, uint256 c2CoinPrice, uint256 pvCoinPrice, uint256 timestamp)
//   event OwnershipTransferred(indexed address previousOwner, indexed address newOwner)
//   event Paused(address account)
//   event Unpaused(address account)
 */

export const ELECTRICITYPRICEORACLE_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_rmbUsdtAggregator",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_c2CoinAggregator",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_pvCoinAggregator",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "EnforcedPause",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ExpectedPause",
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
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "aggregatorType",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newAggregator",
        "type": "address"
      }
    ],
    "name": "ChainlinkAggregatorUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newThreshold",
        "type": "uint256"
      }
    ],
    "name": "ChainlinkDataFreshnessThresholdUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newThreshold",
        "type": "uint256"
      }
    ],
    "name": "DataFreshnessThresholdUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "month",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "currentMonth",
        "type": "uint256"
      }
    ],
    "name": "FutureMonthRejected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "month",
        "type": "uint256"
      }
    ],
    "name": "MonthDataAlreadyExists",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "month",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "generation",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "revenue",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rmbUsdtRate",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "c2CoinPrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "pvCoinPrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "OracleDataUpdated",
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
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Paused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Unpaused",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "PRICE_PRECISION",
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
    "inputs": [],
    "name": "RATE_PRECISION",
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
    "inputs": [],
    "name": "REVENUE_PRECISION",
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
    "inputs": [],
    "name": "c2CoinAggregator",
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
    "name": "chainlinkDataFreshnessThreshold",
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
    "inputs": [],
    "name": "dataFreshnessThreshold",
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
        "name": "_month",
        "type": "uint256"
      }
    ],
    "name": "getC2CoinPriceByMonth",
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
    "inputs": [],
    "name": "getChainlinkC2CoinPrice",
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
    "inputs": [],
    "name": "getChainlinkPVCoinPrice",
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
    "inputs": [],
    "name": "getChainlinkRMBUSDTRate",
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
    "inputs": [],
    "name": "getCurrentYearMonth",
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
        "name": "_month",
        "type": "uint256"
      }
    ],
    "name": "getGenerationByMonth",
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
    "inputs": [],
    "name": "getLatestC2CoinPrice",
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
    "inputs": [],
    "name": "getLatestGeneration",
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
    "inputs": [],
    "name": "getLatestPVCoinPrice",
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
    "inputs": [],
    "name": "getLatestRMBUSDTRate",
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
    "inputs": [],
    "name": "getLatestRevenue",
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
    "inputs": [],
    "name": "getLatestTimestamp",
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
        "name": "_month",
        "type": "uint256"
      }
    ],
    "name": "getMonthlyData",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "monthlyGeneration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "monthlyRevenue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "rmbUsdtRate",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "c2CoinPrice",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "pvCoinPrice",
            "type": "uint256"
          }
        ],
        "internalType": "struct ElectricityPriceOracle.OracleData",
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
        "name": "_month",
        "type": "uint256"
      }
    ],
    "name": "getPVCoinPriceByMonth",
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
        "name": "_month",
        "type": "uint256"
      }
    ],
    "name": "getRMBUSDTRateByMonth",
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
        "name": "_month",
        "type": "uint256"
      }
    ],
    "name": "getRevenueByMonth",
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
        "name": "_month",
        "type": "uint256"
      }
    ],
    "name": "hasMonthData",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_month",
        "type": "uint256"
      }
    ],
    "name": "isDataFresh",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "lastUpdateMonth",
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
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "monthDataExists",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "oracleData",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "monthlyGeneration",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "monthlyRevenue",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "rmbUsdtRate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "c2CoinPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "pvCoinPrice",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
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
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pvCoinAggregator",
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
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rmbUsdtAggregator",
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
        "name": "_aggregator",
        "type": "address"
      }
    ],
    "name": "setC2CoinAggregator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_newThreshold",
        "type": "uint256"
      }
    ],
    "name": "setChainlinkDataFreshnessThreshold",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_newThreshold",
        "type": "uint256"
      }
    ],
    "name": "setDataFreshnessThreshold",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_aggregator",
        "type": "address"
      }
    ],
    "name": "setPVCoinAggregator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_aggregator",
        "type": "address"
      }
    ],
    "name": "setRMBUSDTAggregator",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_month",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_monthlyGeneration",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_monthlyRevenue",
        "type": "uint256"
      }
    ],
    "name": "updateOracleData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_month",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_monthlyGeneration",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_monthlyRevenue",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_rmbUsdtRate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_c2CoinPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_pvCoinPrice",
        "type": "uint256"
      }
    ],
    "name": "updateOracleDataManual",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export type ElectricityPriceOracleAbi = typeof ELECTRICITYPRICEORACLE_ABI;
