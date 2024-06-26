const express = require("express");
const router = express.Router();
const principalController = require("../controllers/principalController"); 
const upload = require("../config/upload");


router.get('/', 
principalController.page);

router.post('/', 
upload.single('arquivo'), principalController.salvaraqr);



module.exports = router;