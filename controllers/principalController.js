const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const fastcsv = require('fast-csv');
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

function horasParaFloat(horas) {
 
  if (!horas || typeof horas !== 'string') {
    return 0; 
  }

  const negativo = horas.startsWith('-');

  horas = horas.replace(/-/g, '');

 
  if (horas.includes(':')) {
    const partes = horas.split(':');
    let horasInteiras = parseFloat(partes[0]);
    let minutos = parseFloat(partes[1]);


    const minutosComoHora = minutos / 60;


    const horasFloat = horasInteiras + minutosComoHora;


    return negativo ? -horasFloat : horasFloat;
  } else {

    const horasInteiras = parseFloat(horas.substring(0, horas.length - 2));
    const minutos = parseFloat(horas.substring(horas.length - 2));

    const minutosComoHora = minutos / 60;

    const horasFloat = horasInteiras + minutosComoHora;

    return negativo ? -horasFloat : horasFloat;
  }
}

async function csvarq(req, res) {
  try {
    const filePath = path.join(__dirname, "../public/img", req.file.filename);
    const outputFile = path.join(__dirname, "../public/img", 'contratos.csv');

    const processedRows = [];


    fs.createReadStream(filePath, { encoding: 'utf-8' })
      .pipe(csv({ separator: ';' })) 
      .on('data', (row) => {
        if (row.hasOwnProperty('Saldo Banco de Horas')) {
          const novoValor = horasParaFloat(row['Saldo Banco de Horas']).toFixed(3);
          row['Saldo Banco de Horas'] = novoValor;
        } else {
          row['Saldo Banco de Horas'] = '0.00'; 
        }
        processedRows.push(row);
      })
      .on('end', () => {
        fastcsv.writeToPath(outputFile, processedRows, { headers: true })
          .on('finish', () => {
            res.download(outputFile, 'contratos.csv', (err) => {
              if (err) {
                console.error("Erro ao enviar o arquivo para download:", err);
                res.status(500).send("Erro ao enviar o arquivo para download.");
              } else {
                console.log("Arquivo enviado para download com sucesso.");
              }
            });
          });
      });

  } catch (error) {
    console.error("Erro ao processar o arquivo CSV:", error);
    res.status(500).send("Erro ao processar o arquivo CSV.");
  }
}

async function abrirpagcontratosetor(req,res){
    res.render("admin/setor.ejs", { msg: "" });
}

async function csvarqsetor(req, res) {
  try {
    const filePath = path.join(__dirname, "../public/img", req.file.filename);

    const csvFilePath = await processarPDFsetor(filePath);

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

async function processarPDFsetor(filePath) {
  try {
    const dataBuffer = await fs.promises.readFile(filePath);

    return await parsePDFAndSaveToCSVsetor(dataBuffer, filePath);
  } catch (error) {
    console.error("Erro ao processar o PDF:", error);
    throw error;
  }
}

async function parsePDFAndSaveToCSVsetor(dataBuffer, outputFilePath) {
  try {
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    let currentStore = "";
    let currentSector = "";
    let currentRole = "";
    let previousRole = "";
    let previousSector = "";
    let newPage = false;
    let pageSector = "";
    let pageRole = "";
    let pendingLine = null;
    let pendingType = null;
    const results = [];

    const skipPatterns = [
      /^Total do\(a\)/,
      /^Osmar Nicolini Comércio e Distrib S.A\./,
      /^RHPR\d{4}\/\d{4}/,
      /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/,
      /^Pág\.:/,
      /^\d{3,}$/,
      /^G omes$/,
      /^Funcionários Por Setor$/,
      /^\/\/$/,
      /^.*\/.*\/.*$/,
    ];
  
    const skipKeywords = [
      "Gomes", "M onsenhor", "Dom pedrito", "Tupy", "Fragata", "Sede", "Rosário do Sul",
      "Santa tecla", "Rodoviária", "Neto", "São Judas", "Fernando Osório", "Livramento",
      "Quarai", "Caçapava", "São Gabriel", "CDA", "chácara", "Deposito",
      "Filia", "Nicolini", "//", "Contato", "A tacado", "Quaraí"
    ];

    lines.forEach((line, index) => {
      // Identifica nova página e reseta variáveis
      if (line.match(/^Osmar Nicolini Comércio e Distrib S.A\./)) {
        const storeLine = lines[index + 1]?.trim();
        if (storeLine) {
          const [storeNumber, ...storeNameParts] = storeLine.split(' ');
          currentStore = `${storeNumber} ${storeNameParts.join(' ')}`.trim();
        }
        newPage = true;
        previousRole = currentRole;
        previousSector = currentSector;
        console.log("Anteriores");
        console.log(previousRole);
        console.log(previousSector);
        pageSector = "";
        pageRole = "";
      }

      // Lógica para identificar setor e função na nova página
      if (newPage) {
        if (pendingLine) {
          if (line.match(/^\d{8}/)) {
            currentRole = pendingLine;
            currentSector = previousSector;
          } else {
            currentSector = pendingLine;
            currentRole = '';
          }
          pendingLine = '';
          pendingType = '';
        }

        if (line.match("ContatoNomeAdmissão")) {
          const nextLine = lines[index + 1]?.trim();
          if (nextLine) {
            if (nextLine.match(/^\d{8}/)) {
              currentSector = previousSector;
              currentRole = previousRole;
            } else {
              const potentialSector = nextLine.replace(/\d/g, '').trim();
              const nextNextLine = lines[index + 2]?.trim();
              if (nextNextLine && nextNextLine.match(/^\d{8}/)) {
                currentSector = previousSector;
                currentRole = potentialSector;
              } else if (nextNextLine) {
                currentSector = potentialSector;
                currentRole = nextNextLine.replace(/\d/g, '').trim();
              } else {
                pendingLine = potentialSector;
                pendingType = 'sectorOrRole';
              }
            }
          }
          newPage = false;
        }

        if (line.match(/Total do\(a\)/)) {
          const nextLine = lines[index + 1]?.trim();
          if (nextLine) {
            if (!lines[index + 2]) {
              pendingLine = nextLine.replace(/\d/g, '').trim();
              pendingType = 'sectorOrRole';
            } else if (lines[index + 2].match(/^\d{8}/)) {
              currentRole = nextLine.replace(/\d/g, '').trim();
            } else {
              currentSector = nextLine.replace(/\d/g, '').trim();
              currentRole = lines[index + 2]?.replace(/\d/g, '').trim() || '';
            }
          }
          newPage = false;
        }
      }

      // Pular padrões desnecessários
      while (
        lines[index + 1] && 
        (skipPatterns.some(pattern => lines[index + 1].match(pattern)) || 
         skipKeywords.some(keyword => lines[index + 1].toLowerCase().includes(keyword.toLowerCase())))
      ) {
        index++;
      }

      if (line.match(/Total do\(a\)/)) {
        const nextLine = lines[index + 1]?.trim();
        if (nextLine) {
          if (!lines[index + 2]) {
            pendingLine = currentSector;
            pendingType = 'sectorOrRole';
          } else if (lines[index + 2].match(/^\d{8}/)) {
            currentRole = nextLine.replace(/\d/g, '').trim();
          } else {
            currentSector = nextLine.replace(/\d/g, '').trim();
            currentRole = lines[index + 2]?.replace(/\d/g, '').trim() || '';
          }
        }
        newPage = false;
      } else if (line.match(/^\d{8}/)) {
        const match = line.match(/^(\d{8})(.*?)(\d{2}\/\d{2}\/\d{4})$/);
        if (match) {
          const contract = match[1].trim();
          const name = match[2].trim();
          const admissionDate = match[3].trim();

          if (pendingType === 'sectorOrRole') {
            currentRole = pendingLine;
            pendingLine = '';
            pendingType = '';
            currentSector = previousSector || '';
          }

          results.push({
            loja: currentStore,
            contrato: contract,
            nome: name,
            setor: currentSector,
            funcao: currentRole,
            admissao: admissionDate
          });
        }
      } else {
        if (skipPatterns.some(pattern => line.match(pattern))) {
          currentRole = currentSector;
        }

        if (pendingType === 'sectorOrRole' && !line.match(/^\d{8}/)) {
          currentSector = pendingLine;
          currentRole = '';
          pendingLine = '';
          pendingType = '';
        }
      }
    });

    const csvData = results.map(row => `${row.loja},${row.contrato},${row.nome},${row.setor},${row.funcao},${row.admissao}`).join('\n');
    const csvHeader = 'Loja,Contrato,Nome,Setor,Funcao,Admissao\n';
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










module.exports = {
  principal,
  abrirbancohr,
  abrirpagcontrato,
  salvaraqr,
  csvarq,
  processarPDF,
  parsePDFAndSaveToCSV,
  abrirpagcontratosetor,
  csvarqsetor
};
