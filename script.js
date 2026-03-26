// =============================================================
//  HOW TO ADD A NEW PROJECT
//
//  1. Create a subfolder for your project, e.g.:
//       projects/my-new-app/
//
//  2. Put your project files inside it (at minimum an index.html)
//
//  3. Optionally add a screenshot:
//       projects/my-new-app/screenshot.png
//
//  4. Add ONE new object to the PROJECTS array below:
//
//       {
//         title:       "My New App",           // required
//         description: "What the app does.",   // required
//         url:         "./my-new-app/",         // required — path to the project
//         screenshot:  "./my-new-app/screenshot.png",  // optional
//         icon:        "🎨"                     // optional emoji (used when no screenshot)
//       }
//
//  5. Save this file and refresh the browser. Done!
// =============================================================

const PROJECTS = [
  {
    title: "LogoDraw",
    description: "Learn to draw famous company logos step-by-step using the grid method. Covers tech, food, sports, automotive, fashion, entertainment and more.",
    url: "./logo-draw/",
    icon: "🏢"
  },
  {
    title: "BrainrotDraw",
    description: "Learn to draw Italian Brainrot characters step-by-step using the grid method. Features Tralalero Tralala, Bombardiro Crocodilo, Tung Tung Tung Sahur and more.",
    url: "./brainrot-draw/",
    icon: "🧠"
  },
  {
    title: "FoodDraw",
    description: "Learn to draw foods from all over the world step-by-step using the grid method. Covers fruits, vegetables, dishes, desserts, snacks and much more.",
    url: "./food-draw/",
    icon: "🍕"
  },
  {
    title: "SpaceJamDraw",
    description: "Learn to draw Space Jam characters step-by-step using the grid method. Features Bugs Bunny, Michael Jordan, the Monstars, DC heroes and more.",
    url: "./space-jam-draw/",
    icon: "🏀"
  },
];

// =============================================================
//  RENDERING ENGINE — no need to edit below this line
// =============================================================

function createCard(project) {
  const card = document.createElement('article');
  card.className = 'card';

  let mediaHTML;
  if (project.screenshot) {
    mediaHTML = `<img class="card-screenshot" src="${project.screenshot}" alt="${project.title} screenshot" loading="lazy">`;
  } else {
    const icon = project.icon || '🚀';
    mediaHTML = `<div class="card-placeholder"><span>${icon}</span></div>`;
  }

  card.innerHTML = `
    ${mediaHTML}
    <div class="card-body">
      <h3 class="card-title">${project.title}</h3>
      <p class="card-desc">${project.description}</p>
      <a class="card-link" href="${project.url}" target="_blank" rel="noopener noreferrer">Visit Site</a>
    </div>
  `;

  return card;
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  if (PROJECTS.length === 0) {
    grid.innerHTML = '<p class="projects-empty">No projects yet — add one to <strong>script.js</strong>!</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  PROJECTS.forEach(project => fragment.appendChild(createCard(project)));
  grid.appendChild(fragment);
}

// Set footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Render projects
renderProjects();
