import assert from "node:assert/strict";
import { getProfileDisplayName, getProfileInitials } from "../src/lib/profileName";

// The signed-in person is identified by their Name only — never an email address.
assert.equal(getProfileDisplayName({ full_name: "Ravi Kumar" }, { email: "ravi@acme.in" }), "Ravi Kumar");
assert.equal(
  getProfileDisplayName(null, { email: "ravi@acme.in", user_metadata: { full_name: "Ravi Kumar" } }),
  "Ravi Kumar",
);

// No saved name: a neutral label, not the email and not an email prefix.
assert.equal(getProfileDisplayName({ full_name: "  " }, { email: "ravi@acme.in" }), "User");
assert.equal(getProfileDisplayName({ full_name: "ravi@acme.in" }, { email: "ravi@acme.in" }), "User");
assert.equal(getProfileDisplayName({ email: "ravi@acme.in" }, null), "User");

// Initials come from the name, and an email can never leak into them.
assert.equal(getProfileInitials("Ravi Kumar"), "RK");
assert.equal(getProfileInitials("Ravi"), "RA");
assert.equal(getProfileInitials("User"), "U");
assert.equal(getProfileInitials(getProfileDisplayName({ email: "ravi@acme.in" })), "U");

console.log("profile-name ok");
