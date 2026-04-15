const CV_FILES = [
    { file: "resumes/resume-intern.pdf", label: "Intern", tag: "Entry Level" },
    { file: "resumes/resume-fresher.pdf", label: "Fresher", tag: "Fresher" },
    { file: "resumes/resume-junior.pdf", label: "Junior", tag: "Junior Developer" },
    { file: "resumes/resume-middle.pdf", label: "Middle", tag: "Mid-Level Developer" },
    { file: "resumes/resume-senior.pdf", label: "Senior", tag: "Senior Developer" },
    { file: "resumes/resume-lead.pdf", label: "Tech Lead", tag: "Team Lead" },
];

const pdfIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
<polyline points="14 2 14 8 20 8"/>
<line x1="9" y1="13" x2="15" y2="13"/>
<line x1="9" y1="17" x2="13" y2="17"/>
</svg>`;

let activeDesktop = null;

const sidebar = document.getElementById('sidebar');
document.getElementById('toggle-btn').onclick = () => {
    sidebar.classList.toggle('collapsed');
};

async function checkFile(url) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
}

function openViewer(cv, item) {
    if (activeDesktop) activeDesktop.classList.remove('active');
    item.classList.add('active');
    activeDesktop = item;

    document.getElementById('bar-title').textContent = cv.label;
    document.getElementById('bar-tag').textContent = cv.tag;

    renderPDF(cv.file);

    document.getElementById('empty-viewer').style.display = 'none';

    const open = document.getElementById('open-btn');
    open.href = cv.file;
    open.style.display = '';
}

async function init() {
    const list = document.getElementById('cv-list');
    const footer = document.getElementById('footer');

    const checks = await Promise.all(CV_FILES.map(cv => checkFile(cv.file)));
    const available = CV_FILES.filter((_, i) => checks[i]);

    list.innerHTML = '';

    if (available.length === 0) {
        list.innerHTML = 'No resumes found';
        footer.textContent = '0 resumes';
        return;
    }

    const items = [];

    available.forEach((cv, i) => {
        const item = document.createElement('div');
        item.className = 'cv-item';
        item.innerHTML = `
      <div>
        <div class="cv-name">${cv.label}</div>
      </div>
    `;

        item.onclick = () => openViewer(cv, item);

        list.appendChild(item);
        items.push(item);
    });

    footer.textContent = available.length + ' resumes';

    gsap.to(items, {
        opacity: 1,
        y: 0,
        stagger: 0.05,
        duration: 0.4
    });

    items[0].click();
}

const container = document.getElementById("pdf-container");

async function renderPDF(url) {
    container.innerHTML = "";

    const pdf = await pdfjsLib.getDocument(url).promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        canvas.style.display = "block";
        canvas.style.margin = "0 auto 24px";
        canvas.style.boxShadow = "0 10px 40px rgba(0,0,0,0.5)";

        container.appendChild(canvas);

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
    }
}

init();