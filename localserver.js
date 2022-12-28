const http = require("http");
const fs = require("fs");
const util = require("util");
const mime = require("mime-types");

fs.readFile = util.promisify(fs.readFile).bind(this);
fs.readDir = util.promisify(fs.readdir).bind(this);

const host = {
	hostname: "0.0.0.0",
	port: process.env.PORT || 8000
};

const app = {
	versionString: `${process.env.npm_package_name}-${process.env.npm_package_version}`,
	homepage: `http://localhost:${host.port}`,
}

const server = http.createServer(async (req, res) => {
	let mimetype = mime.lookup(req.url);
	req.path = decodeURI(req.url.split("?")[0]);
	if (fs.existsSync(req.path)) {
		if (fs.lstatSync(fs.realpathSync(req.path)).isDirectory()) {
			if (fs.existsSync(req.path + "index.html")) {
				fs.readFile(`${req.path + "index.html"}`).then(content => {
					res.writeHead(200, {"Content-Type": mimetype});
					res.write(content);
					res.end();
				}).catch(err => {
					res.writeHead(200, {"Content-Type": "text/html"});
					res.write(`${err.message}`);
					res.end();
				});
			} else {
				fs.readDir(req.path).then(files => {
					res.writeHead(200, {"Content-Type": "text/html"});
					res.write(`<html><head>`)
					res.write(`<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; object-src 'none'; script-src resource: chrome:; connect-src https:; img-src http: data: blob: chrome:; style-src 'unsafe-inline';"><meta name="color-scheme" content="light dark">`);
					res.write(`<style>a {text-decoration: none} a:link:hover {text-decoration: underline} li.directory { list-style: "[] " }</style>`);
					res.write(`</html><body>`)
					crumbs = req.path.split("/");
					path = ``;
					crumbPaths = [`<a href="/">${app.homepage}</a>`];
					for (dir of crumbs) {
						if (dir) {
							path = path + dir + "/";
							crumbPaths.push(`<a href="/${path}">${dir}</a>`);
						}
					}
					res.write(`<p>Contents of ${crumbPaths.join("/")}</p>`);
					if (req.path == "/") {
						res.write(`<p><a disabled">Up</a></p>`);
					} else {
						res.write(`<p><a href="${app.homepage}/${path.split("/").slice(0, -2).join("/")}/">Up</a></p>`);
					}

					res.write(`<ul>`);
					dirs = []; regfiles = []; href = Object.create(null);
					for (file of files) {
						href[file] = req.path + file;
						if (fs.lstatSync(fs.realpathSync(`${req.path}/${file}`)).isDirectory()) {
							dirs.push(file);
						} else {
							regfiles.push(file)
						}
					}
					for (dir of dirs) {
						if (dir[0] !== ".") {
							res.write(`<li class="directory"><a href="${href[dir]}/">${dir}</a></li>`);
						}
					}
					for (dir of dirs) {
						if (dir[0] === ".") {
							res.write(`<li class="directory"><a href="${href[dir]}/">${dir}</a></li>`);
						}
					}
					for (regfile of regfiles) {
						if (regfile[0] !== ".") {
							res.write(`<li><a href="${href[regfile]}">${regfile}</a></li>`);
						}
					}
					for (regfile of regfiles) {
						if (regfile[0] === ".") {
							res.write(`<li><a href="${href[regfile]}">${regfile}</a></li>`);
						}
					}
					res.write(`</ul>`);
					res.write(`</body></html>`)
					res.end();
				});
			}
		} else {
			fs.readFile(`${req.path}`).then(content => {
				res.writeHead(200, {"Content-Type": mimetype});
				res.write(content);
				res.end();
			}).catch(err => {
				res.writeHead(200, {"Content-Type": "text/html"});
				res.write(`${err.message}`);
				res.end();
			});
		}
	} else {
		res.writeHead(404, {"Content-Type": "text/html"});
		res.write(`<h1>404 Not Found</h1>`);
		res.end();
	}
}).listen(host.port, host.hostname).on("error", err => {
	console.log(`\x1b[31m${err.message}\x1b[0m`);
	process.exit(0);
}).on("listening", () => {
	const socketAddress = server.address();
	console.log("\x1b[36m%s\x1b[0m",`[app] ${app.versionString}`, "\x1b[0m");
	console.log("\x1b[36m%s\x1b[0m",`[app] Development server started ${new Date()}`, "\x1b[0m");
	console.log("\x1b[36m%s\x1b[0m",`[app] Running at ${socketAddress.address} over ${socketAddress.port}...`, "\x1b[0m");
	console.log("\x1b[34m%s\x1b[0m",`[app] ${app.homepage}${process.env.HOME}/\x1b[0m`, "\x1b[0m");
});

