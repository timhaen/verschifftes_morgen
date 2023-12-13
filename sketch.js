let svg;

let rangeSlider = document.getElementById("rs-range-line");
let rangeBullet = document.getElementById("rs-bullet");
let playButton = document.getElementById("playButton");
let isPlaying = false;
let animationInterval;
let selectedYear = 1930; // Standardjahr
let projection;
let width;
let height;

rangeSlider.addEventListener(
  "input",
  () => {
    showSliderValue();
    updateData(+rangeSlider.value);
  },
  false
);

function showSliderValue() {
  rangeBullet.innerHTML = rangeSlider.value;
  let bulletPosition = (rangeSlider.value / rangeSlider.max) * 578;
  rangeBullet.style.left = bulletPosition + "px";
}

// Lade & zeichne die GEOJSON-DATEI
d3.json("DATA/schweiz_kantone.geojson").then(function (json) {
  width = window.innerWidth - 250; // Breite des Fensters
  height = window.innerHeight - 125; // Höhe des Fensters

  playButton.addEventListener("click", function () {
    if (isPlaying === true) {
      clearInterval(animationInterval);
      playButton.style.backgroundImage = 'url("GRAPHIC/play.svg")';
    } else {
      animationInterval = setInterval(function () {
        let currentValue = parseInt(rangeSlider.value);
        if (currentValue < parseInt(rangeSlider.max)) {
          rangeSlider.value = currentValue + 1;
          showSliderValue();
          updateData(currentValue + 1);
        } else {
          clearInterval(animationInterval);
          isPlaying = false;
          playButton.style.backgroundImage = 'url("GRAPHIC/play.svg")';
        }
      }, 800);
    }

    isPlaying = !isPlaying;
    playButton.style.backgroundImage = isPlaying
      ? 'url("GRAPHIC/pause.svg")'
      : 'url("GRAPHIC/play.svg")';
  });

  // Projektion auf die sichtbare Fläche beschränken
  projection = d3.geoMercator().fitSize([width, height - 50], json);

  // Erstelle ein SVG-Element zum Zeichnen der Karte
  svg = d3
    .select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  let paths = svg
    .selectAll("path")
    .data(json.features)
    .enter()
    .append("g")
    .attr("class", "ch-map")
    .append("path")
    .attr("d", d3.geoPath().projection(projection));

  // Füge den Event Listener für den Slider hinzu
  d3.select("#rs-range-line").on("input", function () {
    selectedYear = +this.value; // Aktualisiere das ausgewählte Jahr
    updateData(selectedYear); // Aktualisiere die Daten basierend auf dem ausgewählten Jahr
  });

  // Initialisiere die Daten für das Standardjahr
  updateData(selectedYear);
});

document.addEventListener("DOMContentLoaded", function () {
  const timeline = document.querySelector(".timeline-container");

  // Generiere 10 Rechtecke und füge sie zur Timeline hinzu
  for (let i = 0; i < 10; i++) {
    const divider = document.createElement("div");
    divider.classList.add("divider");
    timeline.appendChild(divider);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const timelineFillingContainer = document.querySelector(
    ".timeline-filling-container"
  );

  // Array zum Speichern der Div-Elemente und Farben
  const divArray = [];

  // Funktion zum Aktualisieren des Füllungsdivs
  function drawTimelineFilling() {
    // Durchlaufe die Jahre von 1930 bis 2020
    for (let year = 1930; year <= 2020; year++) {
      d3.csv("DATA/Niederschlag seit 1930 riesig.csv").then(function (data) {
        // Extrahiere Längen- und Breitengradwerte sowie Einwohnerzahl und Namen
        const filteredData = data
          .filter((d) => parseInt(d.jahr) === year)
          .map((d) => ({
            niederschlag: parseInt(d.niederschlag),
            jahr: parseInt(d.jahr),
          }));

        // Berechne den durchschnittlichen Niederschlag für alle Orte
        const averageRainfall = Math.round(
          d3.mean(filteredData, (d) => d.niederschlag)
        );
        // Minimum und Maximum für die Farbskala festlegen
        let minRainfall = 865;
        let maxRainfall = 1630;

        let colScale = d3
          .scaleSequential(d3.interpolateYlGnBu) // Farbskala anpassen
          .domain([minRainfall, maxRainfall]);

        // Füge für jeden Schritt ein Div-Element zum Array hinzu
        let div = document.createElement("div");
        div.classList.add("filling");

        // Fülle das Array mit den Farben basierend auf dem Jahresniederschlagsdurchschnitt
        const color = colScale(averageRainfall);
        div.style.backgroundColor = color;
        divArray.push(div);

        // Überprüfe, ob alle Jahre durchlaufen wurden, bevor du zum Container hinzufügst
        if (divArray.length === 2020 - 1930 + 1) {
          // Füge alle Div-Elemente dem Container hinzu
          timelineFillingContainer.append(...divArray);
        }
      });
    }
  }

  // Rufe die Funktion direkt nach der Definition auf
  drawTimelineFilling();
});

// Funktion zum Aktualisieren der Daten basierend auf dem ausgewählten Jahr
function updateData(year) {
  d3.csv("DATA/Niederschlag seit 1930 riesig.csv").then(function (data) {
    // Extrahiere Längen- und Breitengradwerte sowie Einwohnerzahl und Namen
    let rainData = data
      .filter((d) => parseInt(d.jahr) === year)
      .map((d) => ({
        koordinaten: [parseFloat(d.lon), parseFloat(d.lat)],
        niederschlag: parseInt(d.niederschlag),
        name: d.ort,
        jahr: parseInt(d.jahr),
      }));

    rainData.forEach((element, i) => {
      // hexpos zu jedem Item in rainData hinzufügen
      let positions = projection(element.koordinaten);
      element[0] = positions[0];
      element[1] = positions[1];
    });

    d3.csv("DATA/Extremniederschlag seit 1930.csv").then(function (data) {
      // Extrahiere Längen- und Breitengradwerte sowie Einwohnerzahl und Namen
      let eventData = data
        .filter((d) => {
          // Konvertiere das Datum in das Format JJJJ-MM-TT
          let dateParts = d.datum.split(".");
          let formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
          let info = d.detail;

          // Überprüfe, ob das Jahr dem ausgewählten Jahr entspricht
          return new Date(formattedDate).getFullYear() === year;
        })
        .map((d) => ({
          koordinaten: [parseFloat(d.longitude), parseFloat(d.latitude)],
          art: d.art,
          info: d.detail,
          jahr: parseInt(d.datum),
        }));

      // call the draw & pass the data
      drawData(rainData, eventData);
    });
  });

  // Aktualisiere den Text mit dem ausgewählten Jahr
  // svg.select(".year-text").text("Year: " + year);
}

function drawData(rainData, eventData) {
  // receive the data after it was loaded

  let r = 6;

  let hexbin = d3
    .hexbin()
    .radius(19) // Radius für die Hexagone anpassen
    .extent([
      [0, 0],
      [width, height],
    ]);

  // Hexbin-Aggregation durchführen
  let hexBinData = hexbin(rainData);

  // Daten für die Hexagone vorbereiten (Summe des Niederschlags pro Hexagon)
  let hexagonData = hexBinData.map((hexagon) => ({
    x: hexagon.x,
    y: hexagon.y,
    niederschlagSumme: d3.mean(hexagon, (d) => d.niederschlag),
  }));

  let colScale = d3
    .scaleSequential(d3.interpolateYlGnBu) // Farbskala anpassen
    .domain([
      d3.min(hexagonData, (d) => d.niederschlagSumme),
      d3.max(hexagonData, (d) => d.niederschlagSumme),
    ]);

  // Entferne vorherige Hexagone und Extremereignisse
  svg.selectAll(".hexagon-group").remove();
  svg.selectAll(".event-group").remove();

  // Hexagone zeichnen
  let hexagons = svg
    .selectAll(".hexagon")
    .data(hexagonData)
    .enter()
    .append("g")
    .attr("class", "hexagon-group")
    .attr("opacity", "0.8")
    .attr("transform", function (d) {
      return "translate(" + d.x + "," + d.y + ")";
    });

  hexagons
    .append("path")
    .attr("class", "hexagon")
    .attr("d", function (d) {
      // Überprüfe, ob der Niederschlagswert gültig ist
      return isNaN(d.niederschlagSumme) ? null : hexbin.hexagon();
    })
    .style("fill", function (d) {
      // Überprüfe, ob der Niederschlagswert gültig ist
      return isNaN(d.niederschlagSumme)
        ? "none"
        : colScale(d.niederschlagSumme);
    })
    .style("stroke", "white")
    .style("stroke-width", 1)
    .style("opacity", function (d) {
      // Überprüfe, ob der Niederschlagswert gültig ist
      return isNaN(d.niederschlagSumme) ? 0 : 1;
    });

  hexagons
    .append("text")
    .attr("class", "hexagon-text")
    .attr("text-anchor", "middle")
    .attr("dy", ".35em")
    .text(function (d) {
      // Überprüfe, ob der Niederschlagswert gültig ist
      return isNaN(d.niederschlagSumme) ? "" : Math.round(d.niederschlagSumme);
    })
    .style("fill", "black")
    .style("font-size", "1.3vh")
    .style("font-family", "space grotesk");

  // Verwende d3.scaleOrdinal für die Farben der Extremereignisse
  let eventColorScale = d3
    .scaleOrdinal()
    .domain(["hochwasser", "Sturzflut 3", "Sturzflut 2", "Sturzflut 1"])
    .range([
      "GRAPHIC/hochwasser.svg",
      "GRAPHIC/tropfen 3.svg",
      "GRAPHIC/tropfen 2.svg",
      "GRAPHIC/tropfen 1.svg",
    ]);
  // Kreise für Extremereignisse zeichnen
  let circlesEvent = svg
    .selectAll("g.event-group")
    .data(eventData)
    .enter()
    .append("g")
    .attr("class", "event-group")
    .attr("transform", (d) => `translate(${projection(d.koordinaten)})`)
    .on("mouseover", function (event, d) {
      // Zeige den Tooltip neben dem Kreis an
      tooltipContainer.transition().duration(100).style("opacity", 1);

      // Aktualisiere den Text des Tooltips
      tooltipText.text(d.info);

      // Berechne die Position des Kreises relativ zum Tooltip-Container
      let circlePosition = projection(d.koordinaten);
      let tooltipX = circlePosition[0] + 10; // Offset hinzufügen
      let tooltipY = circlePosition[1] + 10; // Offset hinzufügen

      // Setze die Position des Tooltips
      tooltipContainer.attr("transform", `translate(${tooltipX},${tooltipY})`);

      // Passe die Breite des Hintergrunds an den Text an, begrenzt auf maximal 200
      let textWidth = tooltipText.node().getBBox().width;
      let backgroundWidth = Math.min(textWidth + 20); // 20 als zusätzlicher Abstand
      tooltipBackground.attr("width", backgroundWidth);

      // Passe die Höhe des Hintergrunds an den Text an
      let textHeight = tooltipText.node().getBBox().height;
      tooltipBackground.attr("height", textHeight + 20); // 20 als zusätzlicher Abstand

      // Passe die Position des Texts an, um ihn vertikal zu zentrieren
      tooltipText.attr("y", (textHeight + 25) / 2);
    })
    .on("mouseout", function () {
      // Verstecke den Tooltip
      tooltipContainer.transition().duration(500).style("opacity", 0);
    });

  circlesEvent
    .append("circle")
    .attr("r", 15) // Radius des Kreises
    .style("fill", "rgb(230,230,230)") // Füllfarbe des Kreises (none für keine Füllung)
    .style("stroke", "none") // Randfarbe des Kreises
    .style("stroke-width", 1); // Breite des Kreisrandes

  // SVG-Element mit entsprechendem Pfad basierend auf der Datenart hinzufügen
  circlesEvent
    .append("svg:image")
    .attr("xlink:href", (d) => eventColorScale(d.art))
    .attr("x", -r - 5.5)
    .attr("y", -r - 5.5)
    .attr("width", 23)
    .attr("height", 23);

  // Erstelle ein Tooltip-SVG-Element innerhalb des Haupt-SVGs
  let tooltipContainer = svg
    .append("g")
    .attr("class", "tooltip-container")
    .style("opacity", 0);

  let tooltipBackground = tooltipContainer
    .append("rect")
    .attr("class", "tooltip-background")
    .attr("rx", 10)
    .attr("ry", 10);

  let tooltipText = tooltipContainer
    .append("text")
    .attr("class", "tooltip-text")
    .attr("x", 10)
    .attr("y", 0)
    .text("");
}
