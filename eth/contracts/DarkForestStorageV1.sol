// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// Import base Initializable contract
import "./DarkForestTypes.sol";
import "./Whitelist.sol";

contract DarkForestStorageV1 {
    // Contract housekeeping
    address public adminAddress;
    bool public paused;

    // Game config
    bool public DISABLE_ZK_CHECK;
    uint256 public TIME_FACTOR_HUNDREDTHS = 400; //100; // dev use only - speedup/slowdown game
    uint256 public PERLIN_THRESHOLD_1 = 15;
    uint256 public PERLIN_THRESHOLD_2 = 17;
    uint256 public PLANET_RARITY = 6000; //; 16384;
    uint256 public SILVER_RARITY_1 = 8;
    uint256 public SILVER_RARITY_2 = 8;
    uint256 public SILVER_RARITY_3 = 4;

    // Default planet type stats
    uint256[] public planetLevelThresholds;
    uint256[] public cumulativeRarities;
    uint256[] public initializedPlanetCountByLevel;
    DarkForestTypes.PlanetDefaultStats[] public planetDefaultStats;
    DarkForestTypes.Upgrade[4][3] public upgrades;

    // Game world state
    uint256 gameEndTimestamp;
    uint256 target4RadiusConstant;
    uint256 target5RadiusConstant;
    uint256[] public planetIds;
    address[] public playerIds;
    uint256 public worldRadius;
    uint256 public planetEventsCount;
    mapping(uint256 => DarkForestTypes.Planet) public planets;
    mapping(uint256 => DarkForestTypes.PlanetExtendedInfo)
        public planetsExtendedInfo;
    mapping(address => bool) public isPlayerInitialized;

    // maps location id to planet events array
    mapping(uint256 => DarkForestTypes.PlanetEventMetadata[])
        public planetEvents;

    // maps event id to arrival data
    mapping(uint256 => DarkForestTypes.ArrivalData) public planetArrivals;
}
