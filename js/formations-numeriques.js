
// =====================================================
// PTK - CONTENU DYNAMIQUE DES FORMATIONS NUMÉRIQUES
// =====================================================


// 1. Charger la présentation
async function chargerPresentationNumerique() {

    const presentation = document.getElementById("numerique-presentation");

    if (!presentation || !window.ptkSupabase) {
        console.error("Présentation ou connexion Supabase introuvable.");
        return;
    }

    const { data, error } = await window.ptkSupabase
        .from("contenus_pages")
        .select("contenu")
        .eq("page", "formations_numeriques")
        .eq("cle", "numerique_presentation")
        .eq("est_publie", true)
        .maybeSingle();

    if (error) {
        console.error("Erreur de chargement de la présentation :", error);
        return;
    }

    if (data) {
        presentation.textContent = data.contenu;
    }
}


// 2. Créer une carte
function creerCarteNumerique(element, type, index) {

    const carte = document.createElement("article");

    carte.className = type === "domaine"
        ? "card module-card"
        : "card";

    // Icône ou numéro
    const icone = document.createElement("span");

    if (type === "domaine") {
        icone.className = "module-icon";
    } else {
        icone.className = "card-icon";
    }

    icone.setAttribute("aria-hidden", "true");

    icone.textContent = element.icone ||
        String(index + 1).padStart(2, "0");

    carte.appendChild(icone);

    // Titre
    const titre = document.createElement("h3");
    titre.textContent = element.titre || "";
    carte.appendChild(titre);

    // Description
    const description = document.createElement("p");
    description.textContent = element.description || "";
    carte.appendChild(description);

    return carte;
}


// 3. Charger les objectifs et les domaines
async function chargerElementsNumeriques() {

    if (!window.ptkSupabase) {
        console.error("Connexion Supabase introuvable.");
        return;
    }

    const { data, error } = await window.ptkSupabase
        .from("elements_programme")
        .select("programme,type_element,titre,description,icone,ordre")
        .eq("programme", "formation_numerique")
        .eq("est_publie", true)
        .order("ordre", { ascending: true });

    if (error) {
        console.error("Erreur de chargement des formations numériques :", error);
        return;
    }

    if (!data || data.length === 0) {
        console.warn("Aucun élément publié pour les formations numériques.");
        return;
    }

    // Zones de la page
    const zones = {
        objectif: document.getElementById("numerique-objectifs"),
        domaine: document.getElementById("numerique-domaines")
    };

    // Catégories
    const categories = {
        objectif: [],
        domaine: []
    };

    // Répartition des données
    data.forEach(element => {

        if (categories[element.type_element]) {
            categories[element.type_element].push(element);
        }

    });

    // Affichage
    Object.keys(categories).forEach(type => {

        const zone = zones[type];
        const elements = categories[type];

        if (!zone || elements.length === 0) {
            return;
        }

        zone.replaceChildren();

        elements.forEach((element, index) => {

            const carte = creerCarteNumerique(element, type, index);

            zone.appendChild(carte);

        });

    });

    console.log("Objectifs et domaines des formations numériques chargés depuis Supabase.");

}


// 4. Lancer le chargement
async function chargerContenuNumerique() {

    await Promise.all([
        chargerPresentationNumerique(),
        chargerElementsNumeriques()
    ]);

}

chargerContenuNumerique();
