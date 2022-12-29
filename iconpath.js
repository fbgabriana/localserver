const icon = require( "freedesktop-icons" );


const getMimeTypeIcon = mimetype => {
	return icon( [ { name: `${mimetype.replace("/","-")}`, context: "mimetypes", size: 16 }], ["breeze"] );
}

const main = async () => {
	const iconpath = await getMimeTypeIcon("text/plain")
	console.log(iconpath)
}

main()
