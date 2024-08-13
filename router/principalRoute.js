const express = require("express");
const router = express.Router();
const principalController = require("../controllers/principalController"); 
const upload = require("../config/upload");

router.get('/', principalController.principal);

router.get('/bancohr', 
principalController.abrirbancohr);

router.get('/pontovit', principalController.contrato_pontovit);

router.get('/departamento', principalController.contrato_departamento);

router.post('/bancohr', 
upload.single('arquivo'), principalController.salvaraqr);

router.post('/pontovit', 
upload.single('arquivo'), principalController.csvarq);

router.post('/setor', 
upload.single('arquivo'), principalController.csvarqsetor);



module.exports = router;