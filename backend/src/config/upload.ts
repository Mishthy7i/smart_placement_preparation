import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

export const resumeUpload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, callback) => {
        const allowedTypes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/octet-stream",
        ];
        const allowedExtensions = [".pdf", ".docx"];
        const extension = path.extname(file.originalname).toLowerCase();

        if (
            allowedTypes.includes(file.mimetype) &&
            allowedExtensions.includes(extension)
        ) {
            callback(null, true);
        } else {
            callback(new Error("Only PDF and DOCX files are allowed"));
        }
    },
});
