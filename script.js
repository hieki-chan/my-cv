// Array containing the names of SVG files
const svgFiles = [
    '1.svg',
    //'2.svg',
    // Add other SVG files as needed
];

// Container to hold the list of SVGs
const svgList = document.getElementById('pages');

// Loop through each SVG file and create an HTML element for each
svgFiles.forEach(filename => {
    const svgPage = createSVGPage(filename); // Get the div.page element from the function
    svgList.appendChild(svgPage); // Append the element to the svgList
});

// Function to create an HTML .page element and return it
function createSVGPage(filename) {
    const pageDiv = document.createElement('div'); // Create a new div element
    pageDiv.classList.add('page'); // Add the class 'page' to the div

    // Create an embed element to hold the SVG file
    const embedElement = document.createElement('embed');
    embedElement.src = `resources/${filename}`; // Set the path to the SVG file
    embedElement.type = 'image/svg+xml'; // Specify the type as SVG
    embedElement.id = 'svg-content'; // Set an ID for the embed element

    // Append the embed element to the div.page
    pageDiv.appendChild(embedElement);

    // Return the div.page element
    return pageDiv;
}

