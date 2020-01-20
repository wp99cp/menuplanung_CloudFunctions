export const contents = `
    <html><head><style>
    
    
    h1.document-subtitle {
        text-align: center;
    }
    
    h1.document-title {
        text-align: center;
        margin-top: 6cm;
        font-size: 45pt;
    }
    
    span.document-version {
        text-align: center;
        width: 100%;
    }
    
    p.document-version {
        text-align: center;
        margin-top: 13cm;
        color: gray;
    }
    
    page.page {
        page-break-before: always;
        overflow: hidden;
        display: block;
        height: 100vh;
    }
    
    span.disclamer {
        font-size: 8pt;
        color: gray;
        max-width: 12cm;
        display: block;
        line-height: 12pt;
        margin-top: 20cm;
    }
    
    article.page {}
    
    article.page-landscape {
        page-break-before: always;
        overflow: hidden;
        display: flex;
        height: 18cm;
        width: 26cm;
        transform: rotate(90deg);
        margin-top: 5cm;
    }
    
    article.page {
        page-break-before: always;
        overflow: hidden;
        display: block;
    }
    
    ul.camp-info li {
        margin: 0.15cm;
    }
    
    
    </style></head>
    
    
    <body style="
    margin: 0;
    font-family: sans-serif;
">
<article class="page" style="
">
            <h1 class="document-title val-camp-name">Sommerlager 2020</h1>
            <h1 class="document-subtitle">Lagerhandbuch</h1>



<p class="document-version val-current-date">Version vom 23. August 2020</p>

    </article>
<article class="page">
    <h1 class="page-title" style="
    font-size: 28pt;
">Allgemeines zum Lager</h1><ul class="camp-info">
    <li><b>Beschreibung</b> <span class="val-description">Lorem Ipsi, set dolro et ajam najema.</span></li>

    <li><b>Anzahl Teilnehmende:</b> <span class="val-participants">12</span> davon Vegetarier (<span class="val-vegos">2</span>)</li>
    <li><b>Dauer:</b> <span class="val-dauer">11. August bis 22. September 2020</span></li>
</ul>

<span class="disclamer">Wir übernehmen kein Gewähr über die mit eMeal - Menuplanung erstellten Berechnungen und Lagerhandbücher. Obwohl wir unsere Berechnungen regelmässig prüfen, können wir Fehler nie ganz ausschliessen. eMeal - Menuplanung haftet für entstandende Schäden nicht!
</span></article>


        
    <article class="page">
    <h1 class="page-title" style="
    font-size: 28pt;
">Einkaufsliste</h1>

</article></body>


</html>`;
