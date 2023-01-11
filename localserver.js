#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const util = require("util");
const mime = require("mime-types");
const childProcess = require("child_process");
const iconPath = require( "./iconpath" );

fs.readFile = util.promisify(fs.readFile).bind(fs);
fs.readDir = util.promisify(fs.readdir).bind(fs);

const host = require("./host.js");
const app = {
	versionString: `${process.env.npm_package_name}-${process.env.npm_package_version}`,
	homepage: `http://${host}`,
}
const IconPath = Object.create(null);

const server = http.createServer(async (req, res) => {

	let mimetype = mime.lookup(req.url);
	req.path = req.url.split("?")[0];
	try {
		req.path = decodeURI(req.path);
	} catch(err) {
		console.log(`decodeURI failed (${err.message}): ${req.path}`);
	}
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
				fs.readDir(req.path).then(async dirItems => {
					const UAString = req.headers["user-agent"];
					res.writeHead(200, {"Content-Type": "text/html"});
					res.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light dark">
<title>Index of ${host}${req.path}</title>
`)
					if (UAString.includes("Chrome/")) {
						res.write(`<link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABt0lEQVR42oxStZoWQRCs2cXdHTLcHZ6EjAwnQWIkJyQlRt4Cd3d3d1n5d7q7ju1zv/q+mh6taQsk8fn29kPDRo87SDMQcNAUJgIQkBjdAoRKdXjm2mOH0AqS+PlkP8sfp0h93iu/PDji9s2FzSSJVg5ykZqWgfGRr9rAAAQiDFoB1OfyESZEB7iAI0lHwLREQBcQQKqo8p+gNUCguwCNAAUQAcFOb0NNGjT+BbUC2YsHZpWLhC6/m0chqIoM1LKbQIIBwlTQE1xAo9QDGDPYf6rkTpPc92gCUYVJAZjhyZltJ95f3zuvLYRGWWCUNkDL2333McBh4kaLlxg+aTmyL7c2xTjkN4Bt7oE3DBP/3SRz65R/bkmBRPGzcRNHYuzMjaj+fdnaFoJUEdTSXfaHbe7XNnMPyqryPcmfY+zURaAB7SHk9cXSH4fQ5rojgCAVIuqCNWgRhLYLhJB4k3iZfIPtnQiCpjAzeBIRXMA6emAqoEbQSoDdGxFUrxS1AYcpaNbBgyQBGJEOnYOeENKR/iAd1npusI4C75/c3539+nbUjOgZV5CkAU27df40lH+agUdIuA/EAgDmZnwZlhDc0wAAAABJRU5ErkJggg==">`);
					} else if (UAString.includes("Gecko/")) {
						res.write(`<link rel="icon" type="image/png" href="chrome://global/skin/dirListing/folder.png">`);
					} else {
						res.write(`<link rel="icon" type="image/png" href="${__dirname}/icons/folder.png">`);
					}
					res.write(`
<style>
h1 {border-bottom: 1px solid #c0c0c0; margin-bottom: 10px; padding-bottom: 10px}
.toolbox {position: relative}
a {color: LinkText; text-decoration: none}
a:link:hover {text-decoration: underline} 
li {list-style: none; line-height: 1.5em;}
`)
if (UAString.includes("Chrome")) {
res.write(`
.up {margin-left: 1.5em; padding-left: 24px; background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACM0lEQVR42myTA+w1RxRHz+zftmrbdlTbtq04qRGrCmvbDWp9tq3a7tPcub8mj9XZ3eHOGQdJAHw77/LbZuvnWy+c/CIAd+91CMf3bo+bgcBiBAGIZKXb19/zodsAkFT+3px+ssYfyHTQW5tr05dCOf3xN49KaVX9+2zy1dX4XMk+5JflN5MBPL30oVsvnvEyp+18Nt3ZAErQMSFOfelCFvw0HcUloDayljZkX+MmamTAMTe+d+ltZ+1wEaRAX/MAnkJdcujzZyErIiVSzCEvIiq4O83AG7LAkwsfIgAnbncag82jfPPdd9RQyhPkpNJvKJWQBKlYFmQA315n4YPNjwMAZYy0TgAweedLmLzTJSTLIxkWDaVCVfAbbiKjytgmm+EGpMBYW0WwwbZ7lL8anox/UxekaOW544HO0ANAshxuORT/RG5YSrjlwZ3lM955tlQqbtVMlWIhjwzkAVFB8Q9EAAA3AFJ+DR3DO/Pnd3NPi7H117rAzWjpEs8vfIqsGZpaweOfEAAFJKuM0v6kf2iC5pZ9+fmLSZfWBVaKfLLNOXj6lYY0V2lfyVCIsVzmcRV9Y0fx02eTaEwhl2PDrXcjFdYRAohQmS8QEFLCLKGYA0AeEakhCCFDXqxsE0AQACgAQp5w96o0lAXuNASeDKWIvADiHwigfBINpWKtAXJvCEKWgSJNbRvxf4SmrnKDpvZavePu1K/zu/due1X/6Nj90MBd/J2Cic7WjBp/jUdIuA8AUtd65M+PzXIAAAAASUVORK5CYII=") left/16px no-repeat }
.dir {margin-left: 0; padding-left: 24px; background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABt0lEQVR42oxStZoWQRCs2cXdHTLcHZ6EjAwnQWIkJyQlRt4Cd3d3d1n5d7q7ju1zv/q+mh6taQsk8fn29kPDRo87SDMQcNAUJgIQkBjdAoRKdXjm2mOH0AqS+PlkP8sfp0h93iu/PDji9s2FzSSJVg5ykZqWgfGRr9rAAAQiDFoB1OfyESZEB7iAI0lHwLREQBcQQKqo8p+gNUCguwCNAAUQAcFOb0NNGjT+BbUC2YsHZpWLhC6/m0chqIoM1LKbQIIBwlTQE1xAo9QDGDPYf6rkTpPc92gCUYVJAZjhyZltJ95f3zuvLYRGWWCUNkDL2333McBh4kaLlxg+aTmyL7c2xTjkN4Bt7oE3DBP/3SRz65R/bkmBRPGzcRNHYuzMjaj+fdnaFoJUEdTSXfaHbe7XNnMPyqryPcmfY+zURaAB7SHk9cXSH4fQ5rojgCAVIuqCNWgRhLYLhJB4k3iZfIPtnQiCpjAzeBIRXMA6emAqoEbQSoDdGxFUrxS1AYcpaNbBgyQBGJEOnYOeENKR/iAd1npusI4C75/c3539+nbUjOgZV5CkAU27df40lH+agUdIuA/EAgDmZnwZlhDc0wAAAABJRU5ErkJggg==") left/16px no-repeat; }
.file {margin-left: 0; padding-left: 24px; background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAABnRSTlMAAAAAAABupgeRAAABEElEQVR42nRRx3HDMBC846AHZ7sP54BmWAyrsP588qnwlhqw/k4v5ZwWxM1hzmGRgV1cYqrRarXoH2w2m6qqiqKIR6cPtzc3xMSML2Te7XZZlnW7Pe/91/dX47WRBHuA9oyGmRknzGDjab1ePzw8bLfb6WRalmW4ip9FDVpYSWZgOp12Oh3nXJ7nxoJSGEciteP9y+fH52q1euv38WosqA6T2gGOT44vry7BEQtJkMAMMpa6JagAMcUfWYa4hkkzAc7fFlSjwqCoOUYAF5RjHZPVCFBOtSBGfgUDji3c3jpibeEMQhIMh8NwshqyRsBJgvF4jMs/YlVR5KhgNpuBLzk0OcUiR3CMhcPaOzsZiAAA/AjmaB3WZIkAAAAASUVORK5CYII=") left/16px no-repeat }
`)
} else if (UAString.includes("Gecko/")) {
res.write(`
.up {margin-left: 1.5em; padding-left: 24px; background: url("chrome://global/skin/dirListing/up.png") left/16px no-repeat; }
.dir {margin-left: 0; padding-left: 24px; background: url("chrome://global/skin/dirListing/folder.png") left/16px no-repeat; }
.file {margin-left: 0; padding-left: 24px; background: url("${__dirname}/icons/file.svg") left/16px no-repeat }
`)
} else {
res.write(`
.up {margin-left: 1.5em; padding-left: 24px; background: url("${__dirname}/icons/up.png") left/16px no-repeat }
.dir {margin-left: 0; padding-left: 24px; background: url("${__dirname}/icons/folder.png") left/16px no-repeat; }
.file {margin-left: 0; padding-left: 24px; background: url("${__dirname}/icons/file.svg") left/16px no-repeat }
`)
}
res.write(`
.hidden {display: none}
p#UI_showHidden {position: absolute; top: -1em; left: 480px;}
</style>
<script>
window.addEventListener("DOMContentLoaded", event => {

	const UI_showHidden = document.querySelector("#UI_showHidden");
	const check_showHidden = document.querySelector("#UI_showHidden input[type='checkbox']");
	const list_hiddenItems = document.querySelectorAll(".hidden");

	UI_showHidden.style.display = list_hiddenItems.length ? "block" : "none";
	check_showHidden.checked = localStorage.getItem("show-hidden") === "true";

	const list_showHidden = event => {
		for (listItem of document.querySelectorAll(".hidden")) {
			listItem.style.display = check_showHidden.checked ? "block" : "none";
		}
		localStorage.setItem("show-hidden", check_showHidden.checked)
	}
	check_showHidden.addEventListener("click", list_showHidden);
	list_showHidden();
});
</script>
</head>
<body>
<main>
`)
					const crumbs = req.path.split("/");
					let crumbPaths = [`<a href="/">${host}</a>`];
					let path = `/`;
					for (dir of crumbs) {
						if (dir) {
							path = path + dir + "/";
							crumbPaths.push(`<a href="${path}">${dir}</a>`);
						}
					}
					res.write(`<h1>Index of ${crumbPaths.join("/")}</h1>\n`);
					res.write(`<nav class="toolbox">\n`);

					let strGoUp = "";
					if (UAString.includes("Chrome")) {
						strGoUp = "[parent directory]"
					} else if (UAString.includes("Gecko/")) {
						strGoUp = "Up to higher level directory"
					} else {
						strGoUp = "Up one level"
					}
					if (req.path !== "/") {
						res.write(`<p id="UI_goUp"><a class="up" href="${app.homepage}${path.split("/").slice(0, -2).join("/")}/">${strGoUp}</a></p>\n`);
					}
					res.write(`<p id="UI_showHidden" style="display: none;"><label><input type="checkbox">Show hidden items</label></p>\n`);
					res.write(`</nav>\n`);
					res.write(`<ul>\n`);
					let dirs = []; let files = []; href = Object.create(null); stats = Object.create(null);
					for (dirItem of dirItems) {
						href[dirItem] = req.path + dirItem;
						stats[dirItem] = fs.statSync(href[dirItem]);
						stats[dirItem].isExecutable = stats[dirItem].mode & (fs.constants.S_IXUSR | fs.constants.S_IXGRP | fs.constants.S_IXOTH);
						if (stats[dirItem].isDirectory()) {
							dirs.push(dirItem);
						} else {
							files.push(dirItem)
						}
					}
					for (dir of dirs) {
						if (dir[0] !== ".") {
							res.write(`<li class="dir"><a href="${href[dir]}/">${dir}</a></li>\n`);
						}
					}
					for (dir of dirs) {
						if (dir[0] === ".") {
							res.write(`<li class="dir hidden"><a href="${href[dir]}/">${dir}</a></li>\n`);
						}
					}
					for (file of files) {
						if (file[0] !== ".") {
							mimetype = mime.lookup(file);
							if (!mimetype && stats[file].isExecutable) {
								mimetype = "application/x-executable";
							}
							if (!IconPath[mimetype]) {
								IconPath[mimetype] = await iconPath(mimetype);
							}
							if (IconPath[mimetype]) {
								res.write(`<li class="file" style="background-image: url(${IconPath[mimetype]})"><a href="${href[file]}">${file}</a></li>\n`);
							} else {
								res.write(`<li class="file"><a href="${href[file]}">${file}</a></li>\n`);
							}
						}
					}
					for (file of files) {
						if (file[0] === ".") {
							res.write(`<li class="file hidden"><a href="${href[file]}">${file}</a></li>\n`);
						}
					}
					res.write(`</ul>
</main>
</body>
</html>`)
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
		if (req.path == "/favicon.ico") {
			res.writeHead(204, {"Content-Type": mimetype});
			res.end();
		} else if (req.headers.referer) {
			console.log(`File not found: ${req.path}`);
			res.writeHead(404, {"Content-Type": mimetype});
			res.end();
		} else {
			childProcess.exec(`zenity --info --text='<b>Could not find "${req.path}"</b>.\n\nPlease check the spelling and try again.' --no-wrap`);
			res.writeHead(204, {"Content-Type": mimetype});
			res.end();
		}
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
