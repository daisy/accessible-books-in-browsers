import fs from 'fs-extra';
import dayjs from 'dayjs'
import * as path from 'path';

// TODO include favico
let aboutPageTemplate = (metadata, coverImage) =>
`<!DOCTYPE html>
<html lang="en-us">

<head>
    <meta charset="utf-8" />
    <meta name="generatedBy" content="hand" />
    <title>${metadata['dc:title'].trim()}: About</title>
    <link rel="stylesheet" type="text/css" href="../src/styles/content.css">
    <link rel="stylesheet" type="text/css" href="../src/styles/layout.css">
    <link rel="stylesheet" type="text/css" href="../src/styles/theme.css">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" sizes="96x96" href="favicon-96x96.png">
    <style>    
        main {
            font-family: Arial, sans-serif;
        }
        img {
            height: 15rem;
        }
        .label {
            font-weight: bold;
        }
        li > span {
            display: block;
        }
        ul {
            list-style-type: none;
            padding: 0;
            line-height: 2;
        }
    </style>
</head>

<body>
    
    <main>        
        <h1>About this publication</h1>
        <img src="${coverImage}" alt="Cover image"></img>
        <ul>
            <li><span class="label">Title:</span> <span id="title">${metadata['dc:title']}</span></li>
            <li><span class="label">Created by:</span> <span id="createdby">${metadata['dc:creator']}</span></li>
            <li><span class="label">Date:</span> <span id="date">${metadata['dc:date']}</span></li>
            ${metadata['dc:description'] ? 
            `<li><span class="label">Description:</span> <span id="description">${metadata['dc:description']}</span></li>`
            : ``}
            ${metadata['schema:accessibilitySummary'] ? 
            `<li><span class="label">Accessibility summary:</span> <span id="accessibilitySummary">${metadata['schema:accessibilitySummary']}</span></li>`
            : ``}
        </ul>
    </main>
    
 
 </body>
 </html>
`;

async function makeAboutPage(epub, outputFilename) {
    epub.metadata['dc:date'] = dayjs(epub.metadata['dc:date']).format('D MMMM YYYY');
    let coverImage = path.relative(path.dirname(outputFilename), epub.metadata['cover']);
    let contents = aboutPageTemplate(epub.metadata, coverImage);
    await fs.writeFile(outputFilename, contents);
}

export { makeAboutPage };