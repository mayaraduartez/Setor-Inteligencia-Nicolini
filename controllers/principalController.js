
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const pdfParse = require('pdf-parse');

async function page(req, res) {
  res.render("admin/page.ejs", { msg: "" });
}

async function salvaraqr(req, res) {
  try {
    const filePath = path.join(__dirname, "../public/img", req.file.filename);

    const csvFilePath = await processarPDF(filePath);

    res.download(csvFilePath, 'dados.csv', (err) => {
      if (err) {
        console.error("Erro ao enviar o arquivo para download:", err);
        res.status(500).send("Erro ao enviar o arquivo para download.");
      } else {
        console.log("Arquivo enviado para download com sucesso.");
      }
    });
  } catch (error) {
    console.error("Erro ao processar o arquivo PDF:", error);
    res.status(500).send("Erro ao processar o arquivo PDF.");
  }
}


async function processarPDF(filePath) {
  try {
    // Ler o arquivo PDF
    const dataBuffer = await fs.promises.readFile(filePath);

    // Chamar a função para processar e salvar como CSV
    return await parsePDFAndSaveToCSV(dataBuffer, filePath);
  } catch (error) {
    console.error("Erro ao processar o PDF:", error);
    throw error; // Propagar o erro para tratamento no nível superior
  }
}


async function parsePDFAndSaveToCSV(dataBuffer, outputFilePath) {
  try {
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    const results = [];
    let currentStore = '';
    let currentSaldo = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Identifica o saldo (incluindo saldos entre parênteses e com formato 000:00)
      if (line.match(/^\(?\d{2,3}:\d{2}\)?$/)) {
        // Remove parênteses se houver e adiciona sinal negativo se saldo estiver entre parênteses
        currentSaldo = line.includes('(') ? `-${line.replace(/[()]/g, '').trim()}` : line.trim();
      } 
      // Identifica a loja e contrato e nome
      else if (line.match(/^\d{8} - /)) {
        const [contrato, nome] = line.split(' - ');
        results.push({ loja: currentStore, contrato: contrato.trim(), nome: nome.trim(), saldo: currentSaldo });
        currentSaldo = ''; // Zerar o saldo após processar
      } 
      // Identifica a loja atual
      else if (line.match(/^\d{3} - /)) {
        currentStore = line.split(' - ')[1].trim();
      }
    }

    const csvData = results.map(row => `${row.loja},${row.contrato},${row.nome},${row.saldo}`).join('\n');
    const csvHeader = 'Loja,Contrato,Nome,Saldo\n';
    const csvContent = csvHeader + csvData;

    const csvFilePath = outputFilePath.replace('.pdf', '.csv');
    await fs.promises.writeFile(csvFilePath, csvContent, 'utf8');

    console.log("Arquivo CSV salvo com sucesso:", csvFilePath);
    return csvFilePath;
  } catch (error) {
    console.error("Erro ao processar o PDF e salvar como CSV:", error);
    throw error; // Propaga o erro para tratamento no nível superior
  }
}



module.exports = {
  page,
  salvaraqr,
  processarPDF,
  parsePDFAndSaveToCSV,
};
