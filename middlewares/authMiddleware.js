import jwt from 'jsonwebtoken'
import userModel from '../models/userModel.js';

const protect = async (req, res, next) => {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1]
            let decoded = jwt.verify(token, process.env.JWT_SECRET)
            req.user = await userModel.findById(decoded.id).select("-password")
            next()
        } catch (e) {
            res.status(400).json({message:"Not authorized"})
        }
    }
    else {
        res.status(400).json({message:"Not authorized and no token"})
    }
}

export default protect