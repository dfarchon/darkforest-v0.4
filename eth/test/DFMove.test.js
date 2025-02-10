const { web3 } = require("@openzeppelin/test-environment");
const {
  time,
  expectEvent,
  expectRevert,
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

const {
  DarkForestCore,
  Whitelist,
  Verifier,
  DarkForestPlanet,
  DarkForestLazyUpdate,
  DarkForestUtils,
  DarkForestTypes,
  DarkForestInitialize,
  getPlanetIdFromHex,
  asteroid1Location,
  asteroid2Location,
  star2Location,
  silverStar1Location,
  silverStar2Location,
  lvl4Location1,
  makeInitArgs,
  makeMoveArgs,
  deployer,
  user1,
  user2,
  SMALL_INTERVAL,
  LARGE_INTERVAL,
} = require("./DFTestUtils");

describe("DarkForestMove", function () {
  // test that moves execute and are applied at the right times in the right ways

  describe("move to new planet", function () {
    before(async function () {
      this.timeout(5000);

      await Whitelist.detectNetwork();
      this.whitelistContract = await Whitelist.new({ from: deployer });
      await this.whitelistContract.initialize(deployer, false);

      this.verifierLib = await Verifier.new({ from: deployer });
      this.dfUtilsLib = await DarkForestUtils.new({ from: deployer });
      this.dfLazyUpdateLib = await DarkForestLazyUpdate.new({ from: deployer });
      this.dfTypesLib = await DarkForestTypes.new({ from: deployer });
      await DarkForestPlanet.detectNetwork();
      await DarkForestPlanet.link(
        "DarkForestLazyUpdate",
        this.dfLazyUpdateLib.address
      );
      await DarkForestPlanet.link("DarkForestUtils", this.dfUtilsLib.address);
      this.dfPlanetLib = await DarkForestPlanet.new({ from: deployer });
      this.dfInitializeLib = await DarkForestInitialize.new({ from: deployer });
      await DarkForestCore.detectNetwork();
      await DarkForestCore.link("Verifier", this.verifierLib.address);
      await DarkForestCore.link("DarkForestPlanet", this.dfPlanetLib.address);
      await DarkForestCore.link(
        "DarkForestLazyUpdate",
        this.dfLazyUpdateLib.address
      );
      await DarkForestCore.link("DarkForestTypes", this.dfTypesLib.address);
      await DarkForestCore.link("DarkForestUtils", this.dfUtilsLib.address);
      await DarkForestCore.link(
        "DarkForestInitialize",
        this.dfInitializeLib.address
      );
      this.contract = await DarkForestCore.new({ from: deployer });
      await this.contract.initialize(
        deployer,
        this.whitelistContract.address,
        true
      );
      await this.contract.changeGameEndTime(9997464000, { from: deployer });

      const fromId = getPlanetIdFromHex(asteroid1Location.hex);

      await this.contract.initializePlayer(...makeInitArgs(fromId, 10, 1999), {
        from: user1,
      });
      await this.contract.changeGameEndTime(99999999999999, {
        from: deployer,
      });
      time.increase(LARGE_INTERVAL);
      time.advanceBlock();
    });

    it("should emit event", async function () {
      const fromId = getPlanetIdFromHex(asteroid1Location.hex);
      const toId = getPlanetIdFromHex(asteroid2Location.hex);
      const dist = 100;
      const shipsSent = 50000;
      const silverSent = 0;
      const receipt = await this.contract.move(
        ...makeMoveArgs(fromId, toId, 10, 2000, dist, shipsSent, silverSent),
        { from: user1 }
      );

      expectEvent(
        receipt,
        "ArrivalQueued",
        (eventArgs = {
          arrivalId: web3.utils.toBN(0),
        })
      );
    });

    it("should init new toPlanet", async function () {
      const toId = getPlanetIdFromHex(asteroid2Location.hex);
      const toPlanetExtended = await this.contract.planetsExtendedInfo(toId);
      expect(toPlanetExtended.isInitialized).to.equal(true);
    });

    it("should create new event and arrival with correct delay", async function () {
      const fromId = getPlanetIdFromHex(asteroid1Location.hex);
      const toId = getPlanetIdFromHex(asteroid2Location.hex);
      const planetEventsCount = await this.contract.planetEventsCount();
      const planetEvent0 = await this.contract.planetEvents(toId, 0);
      const planetArrivals = await this.contract.getPlanetArrivals(toId);

      // check planet events: arrival and departure
      expect(planetEvent0.id).to.be.bignumber.equal("0");
      expect(planetEvent0.eventType).to.be.bignumber.equal("0");

      // check planet arrival
      expect(
        planetArrivals[planetEventsCount - 1].player
      ).to.be.bignumber.equal(user1);
      expect(
        planetArrivals[planetEventsCount - 1].fromPlanet
      ).to.be.bignumber.equal(fromId);

      // check that time delay is correct
      const fromPlanet = await this.contract.planets(fromId);

      const dist = 100;
      const expectedTime = Math.floor(
        (dist * 100) / fromPlanet.speed.toNumber()
      );
      const planetArrival = (await this.contract.getPlanetArrivals(toId))[0];
      expect(
        planetArrival.arrivalTime - planetArrival.departureTime
      ).to.be.equal(expectedTime);
    });

    it("should decay ships", async function () {
      const fromId = getPlanetIdFromHex(asteroid1Location.hex);
      const toId = getPlanetIdFromHex(asteroid2Location.hex);

      const fromPlanet = await this.contract.planets(fromId);
      const range = fromPlanet.range.toNumber();
      const popCap = fromPlanet.populationCap.toNumber();
      const shipsSent = 50000;
      const dist = 100;
      const decayFactor = Math.pow(2, dist / range);
      const approxArriving = shipsSent / decayFactor - 0.05 * popCap;

      const planetArrivals = await this.contract.getPlanetArrivals(toId);
      expect(parseInt(planetArrivals[0].popArriving)).to.be.above(
        approxArriving - 1000
      );
      expect(parseInt(planetArrivals[0].popArriving)).to.be.below(
        approxArriving + 1000
      );
    });

    it("should not apply event before arrival time", async function () {
      const toId = getPlanetIdFromHex(asteroid2Location.hex);
      const planetExtendedInfo = await this.contract.planetsExtendedInfo(toId);
      expect(planetExtendedInfo.lastUpdated).to.be.bignumber.equal(
        await time.latest()
      );

      time.increase(SMALL_INTERVAL);
      time.advanceBlock();

      await this.contract.refreshPlanet(toId);

      expect(
        (await this.contract.planets(toId)).population
      ).to.be.bignumber.equal("0");
    });

    it("should apply event after arrival time", async function () {
      const toId = getPlanetIdFromHex(asteroid2Location.hex);
      const planetExtendedInfo = await this.contract.planetsExtendedInfo(toId);
      expect(planetExtendedInfo.lastUpdated).to.be.bignumber.equal(
        await time.latest()
      );

      time.increase(LARGE_INTERVAL);
      time.advanceBlock();

      await this.contract.refreshPlanet(toId);

      expect(
        (await this.contract.planets(toId)).population
      ).to.be.bignumber.above("0");
    });

    it("should select and apply multiple arrivals", async function () {
      const fromId = getPlanetIdFromHex(asteroid2Location.hex);
      const toId = getPlanetIdFromHex(asteroid1Location.hex);
      const dist = 100;
      const shipsSent = 30000;
      const silverSent = 0;
      // drain the population first
      await this.contract.move(
        ...makeMoveArgs(toId, fromId, 16, 2000, dist, 99999, silverSent),
        { from: user1 }
      );

      // initiate move
      await this.contract.move(
        ...makeMoveArgs(fromId, toId, 16, 2000, dist, shipsSent, silverSent),
        { from: user1 }
      );
      await this.contract.move(
        ...makeMoveArgs(fromId, toId, 16, 2000, dist, shipsSent, silverSent),
        { from: user1 }
      );
      await this.contract.move(
        ...makeMoveArgs(fromId, toId, 16, 2000, dist, shipsSent, silverSent),
        { from: user1 }
      );
      let planetArrivals = await this.contract.getPlanetArrivals(toId);
      const popArrivingTotal =
        parseInt(planetArrivals[0].popArriving) +
        parseInt(planetArrivals[1].popArriving) +
        parseInt(planetArrivals[2].popArriving);
      expect(planetArrivals.length).to.equal(3);

      time.increase(200);
      time.advanceBlock();

      await this.contract.refreshPlanet(toId);

      planetArrivals = await this.contract.getPlanetArrivals(toId);
      expect(planetArrivals.length).to.equal(0);

      let planets = await this.contract.planets(toId);
      // above because need to take into account some pop growth
      expect(planets.population).to.be.bignumber.above(
        popArrivingTotal.toString()
      );
    });

    it("should init high level planet with barbarians", async function () {
      const fromId = getPlanetIdFromHex(asteroid2Location.hex);
      const toId = getPlanetIdFromHex(star2Location.hex);
      const dist = 100;
      const shipsSent = 50000;
      const silverSent = 0;

      await this.contract.move(
        ...makeMoveArgs(fromId, toId, 16, 2000, dist, shipsSent, silverSent),
        { from: user1 }
      );

      expect(
        (await this.contract.planets(toId)).population
      ).to.be.bignumber.above("0");
    });

    it("should expand world radius when init high level planet", async function () {
      const initialRadius = await this.contract.worldRadius();
      const fromId = getPlanetIdFromHex(asteroid2Location.hex);

      const toId = getPlanetIdFromHex(lvl4Location1.hex);
      const dist = 100;
      const shipsSent = 40000;
      const silverSent = 0;

      await this.contract.move(
        ...makeMoveArgs(fromId, toId, 20, 2000, dist, shipsSent, silverSent),
        { from: user1 }
      );

      expect(await this.contract.worldRadius()).to.be.bignumber.above(
        initialRadius
      );
    });
  });

  describe("move to friendly planet", function () {
    before(async function () {
      await Whitelist.detectNetwork();
      this.whitelistContract = await Whitelist.new({ from: deployer });
      await this.whitelistContract.initialize(deployer, false);

      this.verifierLib = await Verifier.new({ from: deployer });
      this.dfPlanetLib = await DarkForestPlanet.new({ from: deployer });
      this.dfLazyUpdateLib = await DarkForestLazyUpdate.new({ from: deployer });
      this.dfTypesLib = await DarkForestTypes.new({ from: deployer });
      this.dfUtilsLib = await DarkForestUtils.new({ from: deployer });
      this.dfInitializeLib = await DarkForestInitialize.new({ from: deployer });
      await DarkForestCore.detectNetwork();
      await DarkForestCore.link("Verifier", this.verifierLib.address);
      await DarkForestCore.link("DarkForestPlanet", this.dfPlanetLib.address);
      await DarkForestCore.link(
        "DarkForestLazyUpdate",
        this.dfLazyUpdateLib.address
      );
      await DarkForestCore.link("DarkForestTypes", this.dfTypesLib.address);
      await DarkForestCore.link("DarkForestUtils", this.dfUtilsLib.address);
      await DarkForestCore.link(
        "DarkForestInitialize",
        this.dfInitializeLib.address
      );
      this.contract = await DarkForestCore.new({ from: deployer });
      await this.contract.initialize(
        deployer,
        this.whitelistContract.address,
        true
      );
      await this.contract.changeGameEndTime(9997464000, { from: deployer });

      const fromId = getPlanetIdFromHex(asteroid1Location.hex);
      const toId = getPlanetIdFromHex(asteroid2Location.hex);
      const dist = 100;
      const shipsSent = 40000;
      const silverSent = 0;

      await this.contract.initializePlayer(...makeInitArgs(fromId, 10, 1999), {
        from: user1,
      });

      await this.contract.move(
        ...makeMoveArgs(fromId, toId, 10, 2000, dist, shipsSent, silverSent),
        { from: user1 }
      );
    });

    it("should increase population", async function () {
      const toId = getPlanetIdFromHex(asteroid2Location.hex);

      const planet = await this.contract.planets(toId);
      const initialPlanetPopulation = planet.population;

      time.increase(LARGE_INTERVAL);
      time.advanceBlock();

      await this.contract.refreshPlanet(toId);

      expect(
        (await this.contract.planets(toId)).population
      ).to.be.bignumber.above(initialPlanetPopulation);
    });

    it("should allow overpopulation", async function () {
      const fromId = getPlanetIdFromHex(asteroid1Location.hex);
      const toId = getPlanetIdFromHex(asteroid2Location.hex);
      await this.contract.refreshPlanet(fromId);
      await this.contract.refreshPlanet(toId);
      const planet2 = await this.contract.planets(toId);

      const dist = 100;
      const shipsSent = 50000;
      const silverSent = 0;

      await this.contract.move(
        ...makeMoveArgs(fromId, toId, 16, 2000, dist, shipsSent, silverSent),
        { from: user1 }
      );

      time.increase(200);
      time.advanceBlock();

      await this.contract.refreshPlanet(toId);

      expect(
        (await this.contract.planets(toId)).population
      ).to.be.bignumber.above(planet2.populationCap);
    });

    it("should send silver", async function () {
      const fromId = getPlanetIdFromHex(asteroid1Location.hex);
      const toId = getPlanetIdFromHex(silverStar2Location.hex);
      const toId2 = getPlanetIdFromHex(silverStar1Location.hex);

      const dist = 100;
      const shipsSent = 90000;
      const silverSent = 0;

      await this.contract.move(
        ...makeMoveArgs(fromId, toId, 16, 2000, dist, shipsSent, silverSent),
        { from: user1 }
      );

      time.increase(LARGE_INTERVAL);
      time.advanceBlock();

      await this.contract.refreshPlanet(toId);

      expect((await this.contract.planets(toId)).silver).to.be.bignumber.above(
        "0"
      );

      await this.contract.move(
        ...makeMoveArgs(toId, toId2, 16, 2000, dist, shipsSent, 100),
        { from: user1 }
      );

      time.increase(LARGE_INTERVAL);
      time.advanceBlock();

      await this.contract.refreshPlanet(toId2);

      expect((await this.contract.planets(toId2)).silver).to.be.bignumber.above(
        "0"
      );
    });
  });

  describe("move to enemy planet", function () {
    before(async function () {
      await Whitelist.detectNetwork();
      this.whitelistContract = await Whitelist.new({ from: deployer });
      await this.whitelistContract.initialize(deployer, false);

      this.verifierLib = await Verifier.new({ from: deployer });
      this.dfPlanetLib = await DarkForestPlanet.new({ from: deployer });
      this.dfLazyUpdateLib = await DarkForestLazyUpdate.new({ from: deployer });
      this.dfTypesLib = await DarkForestTypes.new({ from: deployer });
      this.dfUtilsLib = await DarkForestUtils.new({ from: deployer });
      this.dfInitializeLib = await DarkForestInitialize.new({ from: deployer });
      await DarkForestCore.detectNetwork();
      await DarkForestCore.link("Verifier", this.verifierLib.address);
      await DarkForestCore.link("DarkForestPlanet", this.dfPlanetLib.address);
      await DarkForestCore.link(
        "DarkForestLazyUpdate",
        this.dfLazyUpdateLib.address
      );
      await DarkForestCore.link("DarkForestTypes", this.dfTypesLib.address);
      await DarkForestCore.link("DarkForestUtils", this.dfUtilsLib.address);
      await DarkForestCore.link(
        "DarkForestInitialize",
        this.dfInitializeLib.address
      );
      this.contract = await DarkForestCore.new({ from: deployer });
      await this.contract.initialize(
        deployer,
        this.whitelistContract.address,
        true
      );
      await this.contract.changeGameEndTime(9997464000, { from: deployer });

      const planet1 = getPlanetIdFromHex(asteroid1Location.hex);
      const planet2 = getPlanetIdFromHex(asteroid2Location.hex);

      await this.contract.initializePlayer(...makeInitArgs(planet1, 10, 1999), {
        from: user1,
      });

      await this.contract.initializePlayer(...makeInitArgs(planet2, 10, 1999), {
        from: user2,
      });
    });

    it("should decrease population if insufficient to conquer", async function () {
      const planet1Id = getPlanetIdFromHex(asteroid1Location.hex);
      const planet2Id = getPlanetIdFromHex(asteroid2Location.hex);
      const dist = 0; // instant move - just for testing correct decay application
      const shipsSent = 40000;
      const silverSent = 0;

      time.increase(LARGE_INTERVAL);

      await this.contract.move(
        ...makeMoveArgs(
          planet1Id,
          planet2Id,
          10,
          2000,
          dist,
          shipsSent,
          silverSent
        ),
        { from: user1 }
      );

      const toPlanetDef = (
        await this.contract.planets(planet2Id)
      ).defense.toNumber();
      const planetArrival = (
        await this.contract.getPlanetArrivals(planet2Id)
      )[0];
      const shipsMoved = parseInt(planetArrival.popArriving);
      const attackForce = Math.floor((shipsMoved * 100) / toPlanetDef);

      await this.contract.refreshPlanet(planet2Id);

      const planet2 = await this.contract.planets(planet2Id);
      expect(planet2.owner).to.equal(user2);

      // range of tolerances
      expect(planet2.population.toNumber()).to.be.above(
        planet2.populationCap.toNumber() - attackForce - 1000
      );
      expect(planet2.population.toNumber()).to.be.below(
        planet2.populationCap.toNumber() - attackForce + 1000
      );
    });

    it("should conquer planet if sufficient forces", async function () {
      time.increase(LARGE_INTERVAL);
      const planet1Id = getPlanetIdFromHex(asteroid1Location.hex);
      const planet2Id = getPlanetIdFromHex(asteroid2Location.hex);
      const planet3Id = getPlanetIdFromHex(silverStar1Location.hex);
      const dist = 0; // instant move - just for testing correct decay application
      const silverSent = 0;

      // drain planet first
      await this.contract.move(
        ...makeMoveArgs(
          planet2Id,
          planet3Id,
          10,
          2000,
          dist,
          95000,
          silverSent
        ),
        { from: user2 }
      );

      await this.contract.refreshPlanet(planet2Id);
      let planet2 = await this.contract.planets(planet2Id);
      const planet2Pop = planet2.population.toNumber();
      const planet2Def = planet2.defense.toNumber();
      const defenseForce = Math.floor((planet2Pop * planet2Def) / 100);

      await this.contract.move(
        ...makeMoveArgs(
          planet1Id,
          planet2Id,
          10,
          2000,
          dist,
          50000,
          silverSent
        ),
        { from: user1 }
      );

      const planetArrival = (
        await this.contract.getPlanetArrivals(planet2Id)
      )[0];
      const shipsMoved = parseInt(planetArrival.popArriving);

      await this.contract.refreshPlanet(planet2Id);
      planet2 = await this.contract.planets(planet2Id);

      expect(planet2.owner).to.equal(user1);

      // range of tolerances
      expect(planet2.population.toNumber()).to.be.above(
        shipsMoved - defenseForce - 1000
      );
      expect(planet2.population.toNumber()).to.be.below(
        shipsMoved - defenseForce + 1000
      );
    });

    it("should send silver", async function () {
      time.increase(LARGE_INTERVAL);
      const planet1Id = getPlanetIdFromHex(asteroid2Location.hex);
      const planet2Id = getPlanetIdFromHex(silverStar2Location.hex);
      const planet3Id = getPlanetIdFromHex(silverStar1Location.hex);
      const dist = 100;
      const silverSent = 100;

      await this.contract.move(
        ...makeMoveArgs(planet1Id, planet2Id, 20, 2000, dist, 99999, 0),
        { from: user1 }
      );

      time.increase(200);
      time.advanceBlock();

      await this.contract.move(
        ...makeMoveArgs(
          planet3Id,
          planet2Id,
          20,
          2000,
          dist,
          99999,
          silverSent
        ),
        { from: user2 }
      );

      time.increase(200);
      time.advanceBlock();

      await this.contract.refreshPlanet(planet2Id);

      const planet2 = await this.contract.planets(planet2Id);
      expect(planet2.silver).to.be.bignumber.above("0");
    });
  });

  describe("reject move with insufficient resources", function () {
    before(async function () {
      await Whitelist.detectNetwork();
      this.whitelistContract = await Whitelist.new({ from: deployer });
      await this.whitelistContract.initialize(deployer, false);

      this.verifierLib = await Verifier.new({ from: deployer });
      this.dfPlanetLib = await DarkForestPlanet.new({ from: deployer });
      this.dfLazyUpdateLib = await DarkForestLazyUpdate.new({ from: deployer });
      this.dfTypesLib = await DarkForestTypes.new({ from: deployer });
      this.dfUtilsLib = await DarkForestUtils.new({ from: deployer });
      this.dfInitializeLib = await DarkForestInitialize.new({ from: deployer });
      await DarkForestCore.detectNetwork();
      await DarkForestCore.link("Verifier", this.verifierLib.address);
      await DarkForestCore.link("DarkForestPlanet", this.dfPlanetLib.address);
      await DarkForestCore.link(
        "DarkForestLazyUpdate",
        this.dfLazyUpdateLib.address
      );
      await DarkForestCore.link("DarkForestTypes", this.dfTypesLib.address);
      await DarkForestCore.link("DarkForestUtils", this.dfUtilsLib.address);
      await DarkForestCore.link(
        "DarkForestInitialize",
        this.dfInitializeLib.address
      );
      this.contract = await DarkForestCore.new({ from: deployer });
      await this.contract.initialize(
        deployer,
        this.whitelistContract.address,
        true
      );
      await this.contract.changeGameEndTime(9997464000, { from: deployer });

      const planet1 = getPlanetIdFromHex(asteroid1Location.hex);

      await this.contract.initializePlayer(...makeInitArgs(planet1, 10, 1999), {
        from: user1,
      });
    });

    // tried to send more silver than you had
    it("should reject if moving more silver than what the planet has", async function () {
      const planet1Id = getPlanetIdFromHex(asteroid1Location.hex);
      const planet2Id = getPlanetIdFromHex(asteroid2Location.hex);
      const dist = 100;
      const shipsSent = 40000;
      const silverSent = 100;

      await expectRevert(
        this.contract.move(
          ...makeMoveArgs(
            planet1Id,
            planet2Id,
            16,
            2000,
            dist,
            shipsSent,
            silverSent
          ),
          { from: user1 }
        ),
        "Tried to move more silver than what exists"
      );
    });

    // tried to send more pop than you had
    it("should reject if moving more population than what the planet has", async function () {
      const planet1Id = getPlanetIdFromHex(asteroid1Location.hex);
      const planet2Id = getPlanetIdFromHex(asteroid2Location.hex);
      const dist = 100;
      const shipsSent = 99999999999;
      const silverSent = 0;

      await expectRevert(
        this.contract.move(
          ...makeMoveArgs(
            planet1Id,
            planet2Id,
            16,
            2000,
            dist,
            shipsSent,
            silverSent
          ),
          { from: user1 }
        ),
        "Tried to move more population that what exists"
      );
    });

    // tried to send an amount of pop that would result in 0 arriving forces
    it("should reject if moving population that results in 0 arriving forces", async function () {
      const planet1Id = getPlanetIdFromHex(asteroid1Location.hex);
      const planet2Id = getPlanetIdFromHex(asteroid2Location.hex);
      const dist = 100;
      const shipsSent = 100;
      const silverSent = 0;

      await expectRevert(
        this.contract.move(
          ...makeMoveArgs(
            planet1Id,
            planet2Id,
            16,
            2000,
            dist,
            shipsSent,
            silverSent
          ),
          { from: user1 }
        ),
        "Not enough forces to make move"
      );
    });

    it("should reject if moving from planet not owned", async function () {
      const planet1Id = getPlanetIdFromHex(asteroid2Location.hex);
      const planet2Id = getPlanetIdFromHex(asteroid1Location.hex);
      const dist = 100;
      const shipsSent = 50000;
      const silverSent = 0;

      await this.contract.initializePlayer(
        ...makeInitArgs(planet1Id, 10, 1999),
        {
          from: user2,
        }
      );

      await expectRevert(
        this.contract.move(
          ...makeMoveArgs(
            planet1Id,
            planet2Id,
            16,
            2000,
            dist,
            shipsSent,
            silverSent
          ),
          { from: user1 }
        ),
        "Only owner or delegated account can perform operation on planets"
      );
    });

    it("should reject if moving out of radius", async function () {
      const planet1Id = getPlanetIdFromHex(asteroid1Location.hex);
      const planet2Id = getPlanetIdFromHex(asteroid2Location.hex);
      const dist = 100;
      const shipsSent = 50000;
      const silverSent = 0;

      await expectRevert(
        this.contract.move(
          ...makeMoveArgs(
            planet1Id,
            planet2Id,
            16,
            9999999999,
            dist,
            shipsSent,
            silverSent
          ),
          { from: user1 }
        ),
        "Attempting to move out of bounds"
      );
    });
  });
});
