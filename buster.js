var config = module.exports;

config["Tests"] = {
    env: "browser",
    sources: ["navstack.js"],
    tests: ["test/test-helper.js", "test/**/*-test.js"]
};