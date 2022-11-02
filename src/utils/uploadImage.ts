import cloudinary from "cloudinary"

type uploadImage = (image: string, public_id: string, folder: string) => Promise<string>

cloudinary.v2.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadImage: uploadImage = async (image, public_id, folder) => {
	const result = await cloudinary.v2.uploader.upload(image, {
		public_id,
		folder,
		format: "jpg",
		transformation: [
			{ width: 500, aspect_ratio: 1.0, crop: "limit" },
			{
				width: 256,
				height: 256,
				crop: "thumb",
				gravity: "faces:center",
				quality: "auto",
			},
		],
	})
	return result.url
}

export default uploadImage