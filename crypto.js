const bcrypt = require('bcrypt');

const saltRounds = 5;
const hashPassword = async (plaintext) => await bcrypt.hash(plaintext, saltRounds);
const checkPassword = async (plaintext, storedHash) => await bcrypt.compare(plaintext, await storedHash);

module.exports = {hashPassword, checkPassword};
