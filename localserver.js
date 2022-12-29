#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const util = require("util");
const mime = require("mime-types");
const childProcess = require("child_process");
const icon = require( "freedesktop-icons" );

fs.readFile = util.promisify(fs.readFile).bind(this);
fs.readDir = util.promisify(fs.readdir).bind(this);

const host = require("./host.js");
const app = {
	versionString: `${process.env.npm_package_name}-${process.env.npm_package_version}`,
	homepage: `http://${host}`,
}

const getMimeTypeIconPath = async (icontheme="breeze", size=16) => {
	let path = await icon([{ "name": "text-plain", "context": "mimetypes", "size": size }], [icontheme]);
	return path ? path.split("/").slice(0, -1).join("/") : path;
}

getMimeTypeIconPath().then(iconpath => {

const server = http.createServer(async (req, res) => {
	let mimetype = mime.lookup(req.url);
	req.path = decodeURI(req.url.split("?")[0]);
	if (fs.existsSync(req.path)) {
		if (fs.lstatSync(fs.realpathSync(req.path)).isDirectory()) {
			if (req.path.charAt(req.path.length - 1) !== "/") {
				res.writeHead(307, {"Location": `${req.path}/`});
				res.end();
			}
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
					res.write(`<!DOCTYPE html><html lang="en"><head>`)
					res.write(`<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; object-src 'none'; script-src resource: chrome:; connect-src https:; img-src http: data: blob: chrome:; style-src 'unsafe-inline';"><meta name="color-scheme" content="light dark">`);
					res.write(`<style>body {font: caption} .hidden {display: none} a {color: LinkText; text-decoration: none} a:link:hover {text-decoration: underline}  .up { margin-left: 1.5em; padding-left: 24px; background: url("${__dirname}/icons/up.png") left/16px no-repeat } li.dir {list-style: none; margin-left: 0; padding-left: 24px; background: url("${__dirname}/icons/folder.png") left/16px no-repeat; } li.file { list-style: none; margin-left: 0; padding-left: 24px; background: url("${__dirname}/icons/file.svg") left/16px no-repeat } li {line-height: 1.5em;}</style>`);
					res.write(`</html><body>`)
					crumbs = req.path.split("/");
					let crumbPaths = [`<a href="/">${host}</a>`];
					let path = `/`;
					for (dir of crumbs) {
						if (dir) {
							path = path + dir + "/";
							crumbPaths.push(`<a href="${path}">${dir}</a>`);
						}
					}
					res.write(`<h1>Index of ${crumbPaths.join("/")}</h1>`);
					if (req.path !== "/") {
						res.write(`<p id="UI_goUp"><a class="up" href="${app.homepage}${path.split("/").slice(0, -2).join("/")}/">Up to higher level</a></p>`);
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
							res.write(`<li class="dir"><a href="${href[dir]}/">${dir}</a></li>`);
						}
					}
					for (dir of dirs) {
						if (dir[0] === ".") {
							res.write(`<li class="dir hidden"><a href="${href[dir]}/">${dir}</a></li>`);
						}
					}
					for (regfile of regfiles) {
						if (regfile[0] !== ".") {
							let iconpathname = "";
							mimetype = mime.lookup(regfile)
							if (iconpath && mimetype) {
								iconpathname = iconpath + "/" + mimetype.replace("/","-")
								if (fs.existsSync(iconpathname + ".svg")) iconpathname = iconpathname + ".svg";
								if (fs.existsSync(iconpathname + ".png")) iconpathname = iconpathname + ".png";
							}
							if (fs.existsSync(iconpathname)) {
								res.write(`<li class="file" style="background-image: url(${iconpathname})"><a href="${href[regfile]}">${regfile}</a></li>`);
							} else {
								res.write(`<li class="file"><a href="${href[regfile]}">${regfile}</a></li>`);
							}
						}
					}
					for (regfile of regfiles) {
						if (regfile[0] === ".") {
							res.write(`<li class="file hidden"><a href="${href[regfile]}">${regfile}</a></li>`);
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
		if (req.path !== "/favicon.ico") {
			childProcess.exec(`zenity --info --text='<b>Could not find "${req.path}"</b>.\n\nPlease check the spelling and try again.' --no-wrap`);
		}
		res.writeHead(204);
		res.end();
	}
}).listen(host.port, host.hostname).on("error", err => {
	console.log(`\x1b[31m${err.message}\x1b[0m`);
	process.exit(0);
}).on("listening", () => {
	const socketAddress = server.address();
	process.stdout.write("\x1bc");
	console.log("\x1b[36m%s\x1b[0m",`[app] Local server started ${new Date().toLocaleString()}`, "\x1b[0m");
	console.log("\x1b[36m%s\x1b[0m",`[app] Running at ${socketAddress.address} over ${socketAddress.port}...`, "\x1b[0m");
	console.log("\x1b[34m%s\x1b[0m",`[app] ${app.homepage}${process.env.HOME}/\x1b[0m`, "\x1b[0m");
});
});

