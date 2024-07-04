const express = require("express");
const router = express.Router();
const principalController = require("../controllers/principalController"); 
const upload = require("../config/upload");

router.get('/', principalController.principal);

router.get('/bancohr', 
principalController.abrirbancohr);

router.get('/contratos', principalController.abrirpagcontrato);

router.post('/bancohr', 
upload.single('arquivo'), principalController.salvaraqr);

router.post('/contratos', 
upload.single('arquivo'), principalController.salvarcontrato);





module.exports = router;