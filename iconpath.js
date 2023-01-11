const freedesktopIcon = require( "freedesktop-icons" );
const util = require("node:util");
const exec = util.promisify(require("node:child_process").exec);

const getIconPath = (iconname, context="mimetypes") => {

	return exec("gsettings get org.gnome.desktop.interface icon-theme").then(proc => {
		return proc.stdout.trim().replace(/^'|'$/g,"");
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

