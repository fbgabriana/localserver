const util = require("node:util");
const childProcess = require("node:child_process");
const freedesktopIcon = require( "freedesktop-icons" );

childProcess.exec = util.promisify(childProcess.exec).bind(childProcess);

const getIconPath = (iconname, context="mimetypes") => {

	return childProcess.exec("gsettings get org.gnome.desktop.interface icon-theme").then(stdout => {
		return stdout.trim().replace(/^'|'$/g,"");
	}).then(async icontheme => {
		iconname = `${(iconname || "application/octet-stream").replace("/","-")}`;
		return await freedesktopIcon( [ { name: `${iconname}`, context: `${context}`, size: 16 }], [`${icontheme}`] )
			?? await freedesktopIcon( [ { name: `unknown`, context: "mimetypes", size: 16 }], [`${icontheme}`] )
			?? "";
	}).catch(err => {
		return; // return undefined on unsupported systems
	});
}

module.exports = getIconPath;

