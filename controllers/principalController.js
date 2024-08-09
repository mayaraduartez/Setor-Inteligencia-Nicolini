const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const fastcsv = require('fast-csv');
const pdfParse = require('pdf-parse');
const csvParser = require('csv-parser');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const { writeToPath } = require('fast-csv');
const { PDFDocument } = require('pdf-lib');

const { createWorker } = require('tesseract.js');

async function principal(req, res) {
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

async function abrirpagcontratosetor(req, res) {
  res.render("admin/setor.ejs", { msg: "" });
}


async function csvarqsetor(req, res) {
  try {
    const filePath = path.join(__dirname, "../public/img", req.file.filename);

    const csvFilePath = await processarCSVsetor(filePath);

    res.download(csvFilePath, 'dados.csv', (err) => {
      if (err) {
        console.error("Erro ao enviar o arquivo para download:", err);
        res.status(500).send("Erro ao enviar o arquivo para download.");
      } else {
        console.log("Arquivo enviado para download com sucesso.");
      }
    });
  } catch (error) {
    console.error("Erro ao processar o arquivo CSV:", error);
    res.status(500).send("Erro ao processar o arquivo CSV.");
  }
}

async function processarCSVsetor(filePath) {
  try {
    const csvFilePath = await parseCSVAndSaveToCSVsetor(filePath);
    return csvFilePath;
  } catch (error) {
    console.error("Erro ao processar o CSV:", error);
    throw error;
  }
}

async function parseCSVAndSaveToCSVsetor(filePath) {
  try {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          return reject(err);
        }

        const linesArray = data.split('\n').map(line => line.trim()).filter(line => line);

        let currentStore = "";
        let currentSetor = "";
        let currentFuncao = "";
        let currentContrato = "";
        let currentName = "";
        const results = [];

        const skipPatterns = [
          /^Total do\(a\)/,
          /^Osmar/,
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

        

        linesArray.forEach((line, index) => {
         

          // Verifica se a linha começa com "Osmar"
          if (line.match(/^Osmar|^Nicolini|^Ch|^SG|^Onp|^PJ/)) {
            const storeLine = linesArray[index + 1]?.trim();
            if (storeLine) {
              const parts = storeLine.split(/\d{2}\/\d{2}\/\d{4}/);
              currentStore = (parts[0] || '').trim();
              return;
            }
          }

          if (line.match(/^Contato/)) {
            let nextLine = linesArray[index + 1]?.trim();
            let nextNextLine = linesArray[index + 2]?.trim();
        
            // Ignorar todas as linhas "Total do..." abaixo de "Total do..."
            while (nextLine && nextLine.match(/^Total do/)) {
                nextLine = linesArray[++index + 1]?.trim();
                nextNextLine = linesArray[index + 2]?.trim();
            }
        
            // If the next line is not a "Funcionário" but the following one is, treat the next line as "Função"
            if (nextLine && nextNextLine && nextNextLine.match(/^\d{8}/) && 
                !skipPatterns.some(pattern => nextLine.match(pattern)) &&
                !skipKeywords.some(keyword => nextLine.toLowerCase().includes(keyword.toLowerCase()))) {
                currentFuncao = nextLine;
                return;
            }
        
            // Otherwise, process normally for setor and função
            if (nextLine && !nextLine.match(/^\d{8}/) && 
                !skipPatterns.some(pattern => nextLine.match(pattern)) &&
                !skipKeywords.some(keyword => nextLine.toLowerCase().includes(keyword.toLowerCase()))) {
        
                if (nextNextLine && !nextNextLine.match(/^\d{8}/) && 
                    !skipPatterns.some(pattern => nextNextLine.match(pattern)) &&
                    !skipKeywords.some(keyword => nextNextLine.toLowerCase().includes(keyword.toLowerCase()))) {
        
                    currentSetor = nextLine;
                    currentFuncao = nextNextLine;
                } else {
                   
                }
            }
            return;
        }
        
        if (line.match(/Total do\(a\)/)) {
          let nextLine = linesArray[index + 1]?.trim();
          let nextNextLine = linesArray[index + 2]?.trim();
      
          // Ignorar todas as linhas "Total do..." abaixo de "Total do..."
          while (nextLine && nextLine.match(/^Total do/)) {
              nextLine = linesArray[++index + 1]?.trim();
              nextNextLine = linesArray[index + 2]?.trim();
          }
      
          // If the next line is not a "Funcionário" but the following one is, treat the next line as "Função"
          if (nextLine && nextNextLine && nextNextLine.match(/^\d{8}/) && 
              !skipPatterns.some(pattern => nextLine.match(pattern)) &&
              !skipKeywords.some(keyword => nextLine.toLowerCase().includes(keyword.toLowerCase()))) {
              currentFuncao = nextLine;
              return;
          }
      
          // Otherwise, process normally for setor and função
          if (nextLine && !nextLine.match(/^\d{8}/) && 
              !skipPatterns.some(pattern => nextLine.match(pattern)) &&
              !skipKeywords.some(keyword => nextLine.toLowerCase().includes(keyword.toLowerCase()))) {
      
              if (nextNextLine && !nextNextLine.match(/^\d{8}/) && 
                  !skipPatterns.some(pattern => nextNextLine.match(pattern)) &&
                  !skipKeywords.some(keyword => nextNextLine.toLowerCase().includes(keyword.toLowerCase()))) {
      
                  currentSetor = nextLine;
                  currentFuncao = nextNextLine;
              } else {
                 
              }
          }
          return;
      }
      

          // Verifica se a linha contém dados de funcionário
          if (line.match(/^\d{8}/)) {
            const match = line.match(/^(\d{8})\s+(.*?)\s+(\d{2}\/\d{2}\/\d{4})$/);
            if (match) {
              const contrato = match[1].trim();
              const nome = match[2].trim();
              const admissao = match[3].trim();

              results.push({
                loja: currentStore,
                contrato: contrato,
                nome: nome,
                setor: currentSetor,
                funcao: currentFuncao,
                admissao: admissao
              });
            }
          }

        });

        // Criação do conteúdo CSV
        const csvData = results.map(row => `${row.loja},${row.contrato},${row.nome},${row.setor},${row.funcao},${row.admissao}`).join('\n');
        const csvHeader = 'Loja,Contrato,Nome,Setor,Funcao,Admissao'; // Atualize o cabeçalho conforme necessário
        const csvContent = csvHeader + '\n' + csvData;

        // Salva o arquivo CSV
        const csvFilePath = filePath.replace('.txt', '-processed.csv'); // Ajustar a extensão do arquivo
        fs.promises.writeFile(csvFilePath, csvContent, 'utf8')
          .then(() => {
            console.log("Arquivo CSV salvo com sucesso:", csvFilePath);
            resolve(csvFilePath);
          })
          .catch((error) => {
            console.error("Erro ao salvar o arquivo CSV:", error);
            reject(error);
          });
      });
    });
  } catch (error) {
    console.error("Erro ao processar o CSV e salvar como CSV:", error);
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
