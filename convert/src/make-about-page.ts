import {getPackageMetadata} from './package-parser.js';
import fs from 'fs-extra';
import dayjs from 'dayjs'

let aboutPageTemplate = (metadata) =>
`<!DOCTYPE html>
<html lang="en-us">

<head>
    <meta charset="utf-8" />
    <meta name="generatedBy" content="hand" />
    <title>${metadata['dc:title']}: About</title>
    <link rel="stylesheet" type="text/css" href="../styles/a_default.css">
    <link rel="stylesheet" type="text/css" href="../styles/content.css">
    <link rel="stylesheet" type="text/css" href="../styles/layout.css">
    <link rel="stylesheet" type="text/css" href="../styles/theme.css">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
        <img src="${metadata['cover']}" alt="Cover image"></img>
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

async function makeAboutPage(opfFilename, outputFilename) {
    let metadata = await getPackageMetadata(opfFilename);
    metadata['dc:date'] = dayjs(metadata['dc:date']).format('D MMMM YYYY');
    let contents = aboutPageTemplate(metadata);
    await fs.writeFile(outputFilename, contents);
}

export { makeAboutPage };