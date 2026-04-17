const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/auth");

const authMiddleware = (req, res, next) => {

    const authHeader = req.headers.authorization
    
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({
            message: "Authorization token is missing."
        });
    }

    const token = authHeader.split(" ")[1];
    console.log(token)

    try{
        const decoded = jwt.verify(token, jwtSecret);
        console.log(decoded);
        req.user = {id: decoded.id, email: decoded.email}
        next();
    }
    catch(error){
        console.log(error);
        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }

}

module.exports = { authMiddleware };
