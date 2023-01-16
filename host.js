
const host = {
	protocol: "http://",
	hostname: "localhost",
	port: process.env.PORT || 8080,
	toString() {return `${this.hostname}:${this.port}`}
};

module.exports = host;

