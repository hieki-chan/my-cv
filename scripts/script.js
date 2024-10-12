// Fetch the JSON data
fetch('resources/data.json')
    .then(response => {
        // Check if the response is OK (status code 200)
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        // Populate the name
        document.getElementById('name').innerText = data.name;

        // Populate education
        const educationSection = document.querySelector('.left-section:nth-of-type(2) .left-list');
        educationSection.innerHTML = `
            <li>${data.education.school}</li>
            <li>GPA: ${data.education.GPA}</li>
        `;

        // Populate skills
        const skillsSection = document.querySelector('.left-section:nth-of-type(3) .left-list');
        skillsSection.innerHTML = data.skills.map(skill => `<li>${skill}</li>`).join('');

        // Populate languages
        const languagesSection = document.querySelector('.left-section:nth-of-type(4) .left-list');
        languagesSection.innerHTML = data.languages.map(language => `<li>${language}</li>`).join('');

        // Populate Unity skills
        const unitySkillsSection = document.querySelector('.right-section:nth-of-type(2) ul');
        unitySkillsSection.innerHTML = data['unity skills'].map(skill => `<li><span class="highlight-text-1">${skill.title}:</span> ${skill.description}</li>`).join('');

        // Populate projects
        const projectsSection = document.querySelector('.right-section:nth-of-type(3)');
        projectsSection.innerHTML += data.projects.map(project => `
            <h3>${project.title}</h3>
            <p>${project.description.join(' ')}</p>
            <p>Source code: <a href="${project.link}" target="_blank">${project.title}</a></p>
        `).join('');
    })
    .catch(error => console.error('Error loading JSON data:', error));
