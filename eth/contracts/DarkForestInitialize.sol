// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// Libraries
import "./ABDKMath64x64.sol";
import "./DarkForestTypes.sol";

library DarkForestInitialize {
    function initializeDefaults(
        DarkForestTypes.PlanetDefaultStats[] storage planetDefaultStats
    ) public {
        planetDefaultStats.push(
            DarkForestTypes.PlanetDefaultStats({
                label: "Asteroid",
                populationCap: 100000,
                populationGrowth: 417,
                range: 99,
                speed: 75,
                defense: 800,
                silverGrowth: 0,
                silverCap: 0,
                barbarianPercentage: 0
            })
        );

        planetDefaultStats.push(
            DarkForestTypes.PlanetDefaultStats({
                label: "Brown Dwarf",
                populationCap: 400000,
                populationGrowth: 833,
                range: 177,
                speed: 75,
                defense: 800,
                silverGrowth: 14,
                silverCap: 50000,
                barbarianPercentage: 0
            })
        );

        planetDefaultStats.push(
            DarkForestTypes.PlanetDefaultStats({
                label: "Red Dwarf",
                populationCap: 1600000,
                populationGrowth: 1250,
                range: 315,
                speed: 75,
                defense: 600,
                silverGrowth: 69,
                silverCap: 250000,
                barbarianPercentage: 1
            })
        );

        planetDefaultStats.push(
            DarkForestTypes.PlanetDefaultStats({
                label: "White Dwarf",
                populationCap: 6000000,
                populationGrowth: 1667,
                range: 591,
                speed: 75,
                defense: 400,
                silverGrowth: 417,
                silverCap: 2500000,
                barbarianPercentage: 1
            })
        );

        planetDefaultStats.push(
            DarkForestTypes.PlanetDefaultStats({
                label: "Yellow Star",
                populationCap: 20000000,
                populationGrowth: 2167,
                range: 1025,
                speed: 75,
                defense: 200,
                silverGrowth: 1667,
                silverCap: 20000000,
                barbarianPercentage: 2
            })
        );

        planetDefaultStats.push(
            DarkForestTypes.PlanetDefaultStats({
                label: "Blue Star",
                populationCap: 40000000,
                populationGrowth: 2667,
                range: 1261,
                speed: 75,
                defense: 200,
                silverGrowth: 2222,
                silverCap: 40000000,
                barbarianPercentage: 5
            })
        );

        planetDefaultStats.push(
            DarkForestTypes.PlanetDefaultStats({
                label: "Giant",
                populationCap: 55000000,
                populationGrowth: 2917,
                range: 1577,
                speed: 75,
                defense: 200,
                silverGrowth: 2778,
                silverCap: 50000000,
                barbarianPercentage: 9
            })
        );

        planetDefaultStats.push(
            DarkForestTypes.PlanetDefaultStats({
                label: "Supergiant",
                populationCap: 65000000,
                populationGrowth: 3000,
                range: 1892,
                speed: 75,
                defense: 200,
                silverGrowth: 3333,
                silverCap: 60000000,
                barbarianPercentage: 10
            })
        );
    }

    function initializeUpgrades(
        DarkForestTypes.Upgrade[4][3] storage upgrades
    ) public {
        // defense
        upgrades[0][0] = DarkForestTypes.Upgrade({
            popCapMultiplier: 120,
            popGroMultiplier: 120,
            rangeMultiplier: 100,
            speedMultiplier: 100,
            defMultiplier: 150
        });
        upgrades[0][1] = DarkForestTypes.Upgrade({
            popCapMultiplier: 120,
            popGroMultiplier: 120,
            rangeMultiplier: 100,
            speedMultiplier: 100,
            defMultiplier: 150
        });
        upgrades[0][2] = DarkForestTypes.Upgrade({
            popCapMultiplier: 120,
            popGroMultiplier: 120,
            rangeMultiplier: 100,
            speedMultiplier: 100,
            defMultiplier: 150
        });
        upgrades[0][3] = DarkForestTypes.Upgrade({
            popCapMultiplier: 120,
            popGroMultiplier: 120,
            rangeMultiplier: 100,
            speedMultiplier: 100,
            defMultiplier: 150
        });

        // range
        upgrades[1][0] = DarkForestTypes.Upgrade({
            popCapMultiplier: 120,
            popGroMultiplier: 120,
            rangeMultiplier: 125,
            speedMultiplier: 100,
            defMultiplier: 100
        });
        upgrades[1][1] = DarkForestTypes.Upgrade({
            popCapMultiplier: 120,
            popGroMultiplier: 120,
            rangeMultiplier: 125,
            speedMultiplier: 100,
            defMultiplier: 100
        });
        upgrades[1][2] = DarkForestTypes.Upgrade({
            popCapMultiplier: 120,
            popGroMultiplier: 120,
            rangeMultiplier: 125,
            speedMultiplier: 100,
            defMultiplier: 100
        });
        upgrades[1][3] = DarkForestTypes.Upgrade({
            popCapMultiplier: 120,
            popGroMultiplier: 120,
            rangeMultiplier: 125,
            speedMultiplier: 100,
            defMultiplier: 100
        });

        // speed
        upgrades[2][0] = DarkForestTypes.Upgrade({
            popCapMultiplier: 120,
            popGroMultiplier: 120,
            rangeMultiplier: 100,
            speedMultiplier: 150,
            defMultiplier: 100
        });
        upgrades[2][1] = DarkForestTypes.Upgrade({
            popCapMultiplier: 120,
            popGroMultiplier: 120,
            rangeMultiplier: 100,
            speedMultiplier: 150,
            defMultiplier: 100
        });
        upgrades[2][2] = DarkForestTypes.Upgrade({
            popCapMultiplier: 120,
            popGroMultiplier: 120,
            rangeMultiplier: 100,
            speedMultiplier: 150,
            defMultiplier: 100
        });
        upgrades[2][3] = DarkForestTypes.Upgrade({
            popCapMultiplier: 120,
            popGroMultiplier: 120,
            rangeMultiplier: 100,
            speedMultiplier: 150,
            defMultiplier: 100
        });
    }
}
