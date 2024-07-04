const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const pdfParse = require('pdf-parse');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const { PDFDocument } = require('pdf-lib');

const { createWorker } = require('tesseract.js');

async function principal(req,res){
  res.render("admin/principal.ejs");
}

async function abrirbancohr(req, res) {
  res.render("admin/bancohr.ejs", { msg: "" });
}

async function abrirpagcontrato(req, res) {
  res.render("admin/contratos.ejs", { msg: "" });

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

      if (line.match(/^\(?\d{2,3}:\d{2}\)?$/)) {
        currentSaldo = line.includes('(') ? `-${line.replace(/[()]/g, '').trim()}` : line.trim();
      } 
      else if (line.match(/^\d{8} - /)) {
        const [contrato, nome] = line.split(' - ');
        results.push({ loja: currentStore, contrato: contrato.trim(), nome: nome.trim(), saldo: currentSaldo });
        currentSaldo = ''; 
      } 
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
    throw error; 
  }
}

async function salvarcontrato(req, res) {
  try {
    const filePath = path.join(__dirname, "../public/img", req.file.filename);

    const csvFilePath = await processPdf(filePath);

    res.download(csvFilePath, 'contratos.csv', (err) => {
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

async function processPdf(pdfPath) {
  const imagePaths = await convertPdfToImages(pdfPath);

  let extractedText = '';
  for (const imagePath of imagePaths) {
    const text = await extractTextFromImage(imagePath);
    extractedText += text + '\n';
  }

  const rows = parseTable(extractedText);
  await saveToCsv(rows, 'output.csv');
}

function parseTable(text) {
  const lines = text.split('\n');
  const rows = [];

  let currentRecord = {};
  let headersFound = false;
  let headers = [];

  lines.forEach(line => {
    if (line.includes("Funcionário") && line.includes("Unidade") && line.includes("Setor") && line.includes("Cargo") && line.includes("Saldo Banco de Horas")) {
      headersFound = true;
      headers = line.split(/\s+/).filter(Boolean);
    } else if (headersFound) {
      const values = line.split(/\s+/).filter(Boolean);
      if (values.length === headers.length) {
        currentRecord = {};
        headers.forEach((header, index) => {
          currentRecord[header] = values[index];
        });
        rows.push(currentRecord);
      }
    }
  });

  return rows;
}

async function saveToCsv(rows, outputFilePath) {
  const header = Object.keys(rows[0]).map(key => ({ id: key, title: key }));
  const csvWriterInstance = csvWriter({ path: outputFilePath, header });
  await csvWriterInstance.writeRecords(rows);
  console.log(`CSV salvo com sucesso em ${outputFilePath}`);
}

async function convertPdfToImages(pdfPath) {
  const existingPdfBytes = await fs.promises.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const numPages = pdfDoc.getPageCount();
  const imagePaths = [];

  for (let i = 0; i < numPages; i++) {
    const page = pdfDoc.getPage(i);
    const jpgImage = await page.renderToBuffer({ format: 'jpg' });

    const imagePath = `page-${i + 1}.jpg`;
    await fs.promises.writeFile(imagePath, jpgImage);
    imagePaths.push(imagePath);
  }

  return imagePaths;
}

async function extractTextFromImage(imagePath) {
  const worker = createWorker();
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const { data: { text } } = await worker.recognize(imagePath);
  await worker.terminate();
  return text;
}





module.exports = {
  principal,
  abrirbancohr,
  abrirpagcontrato,
  salvaraqr,
  salvarcontrato,
  processarPDF,
  parsePDFAndSaveToCSV,
};
