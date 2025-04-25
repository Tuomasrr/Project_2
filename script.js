const theaterSelect = document.getElementById("theaterSelect");
const dateInput = document.getElementById("dateSelect");
const searchInput = document.getElementById("searchInput");
const container = document.getElementById("moviesContainer");

const today = new Date().toISOString().split("T")[0];
dateInput.value = today;

const eventDetails = {};
let allShowElements = [];

const areaXhr = new XMLHttpRequest();  //Creates XMLHttpRequest to fetch list of all theatre areas
areaXhr.open("GET", "https://www.finnkino.fi/xml/TheatreAreas/", true);
areaXhr.onreadystatechange = function () {
    if (areaXhr.readyState === 4 && areaXhr.status === 200) {
        const xml = areaXhr.responseXML;
        const areas = xml.getElementsByTagName("TheatreArea");

        for (let i = 0; i < areas.length; i++) {
            const id = areas[i].getElementsByTagName("ID")[0].textContent;
            const name = areas[i].getElementsByTagName("Name")[0].textContent;
            const option = document.createElement("option");
            option.value = id;
            option.textContent = name;
            theaterSelect.appendChild(option);
        }
    }
};
areaXhr.send();

document.getElementById("loadBtn").addEventListener("click", function () {
    const area = theaterSelect.value;
    const date = dateInput.value.split("-").reverse().join(".");
    const scheduleUrl = `https://www.finnkino.fi/xml/Schedule/?area=${area}&dt=${date}`;

    container.innerHTML = "<p style='color: white;'>Ladataan esitykset...</p>";

    const scheduleReq = new XMLHttpRequest();
    scheduleReq.open("GET", scheduleUrl, true);
    scheduleReq.onreadystatechange = function () {
        if (scheduleReq.readyState === 4 && scheduleReq.status === 200) {
            const scheduleXml = scheduleReq.responseXML;
            const shows = scheduleXml.getElementsByTagName("Show");
            const eventsToFetch = new Set();
            const showsData = [];

            for (let i = 0; i < shows.length; i++) {
                const show = shows[i];
                const eventID = show.getElementsByTagName("EventID")[0].textContent;
                const title = show.getElementsByTagName("Title")[0].textContent;
                const startTime = new Date(show.getElementsByTagName("dttmShowStart")[0].textContent);
                const theater = show.getElementsByTagName("Theatre")[0].textContent;

                eventsToFetch.add(eventID);
                showsData.push({ eventID, title, startTime, theater });
            }

            const eventReq = new XMLHttpRequest();
            eventReq.open("GET", `https://www.finnkino.fi/xml/Events/?includeVideos=true`, true);
            eventReq.onreadystatechange = function () {
                if (eventReq.readyState === 4 && eventReq.status === 200) {
                    const eventXml = eventReq.responseXML;
                    const events = eventXml.getElementsByTagName("Event");

                    for (let i = 0; i < events.length; i++) {
                        const ev = events[i];
                        const id = ev.getElementsByTagName("ID")[0].textContent;
                        if (eventsToFetch.has(id)) {
                            const videos = ev.getElementsByTagName("EventVideo");
                            let videoUrl = "";
                            if (videos.length > 0) {
                                const ytId = videos[0].getElementsByTagName("Location")[0]?.textContent;
                                if (ytId) videoUrl = `https://www.youtube.com/watch?v=${ytId}`;
                            }
                            eventDetails[id] = {
                                image: ev.getElementsByTagName("EventLargeImagePortrait")[0]?.textContent || "",
                                desc: ev.getElementsByTagName("ShortSynopsis")[0]?.textContent || "Ei kuvausta saatavilla.",
                                video: videoUrl
                            };
                        }
                    }

                    container.innerHTML = "";
                    allShowElements = [];
                    showsData.forEach(show => {
                        const detail = eventDetails[show.eventID] || { image: '', desc: '', video: '' };
                        const div = document.createElement("div");
                        div.className = "movie";
                        div.innerHTML = `
                  <img src="${detail.image}" alt="${show.title}">
                  <div class="info">
                    <h2>${show.title}</h2>
                    <p>${detail.desc}</p>
                    <p><strong>Näytösaika:</strong> ${show.startTime.toLocaleString("fi-FI")}</p>
                    <p><strong>Näytöspaikka:</strong> ${show.theater}</p>
                    ${detail.video ? `<p><a href="${detail.video}" target="_blank">Katso traileri</a></p>` : ""}
                  </div>
                `;
                        container.appendChild(div);
                        allShowElements.push({ title: show.title.toLowerCase(), element: div });
                    });

                    if (showsData.length === 0) {
                        container.innerHTML = "<p style='color: red;'>Ei näytöksiä valittuna päivänä.</p>";
                    }
                }
            };
            eventReq.send();
        }
    };
    scheduleReq.send();
});

searchInput.addEventListener("input", function () {
    const search = this.value.toLowerCase();
    allShowElements.forEach(item => {
        item.element.style.display = item.title.includes(search) ? "flex" : "none";
    });
});