
// =====================================================
// PTK - CONTENU DYNAMIQUE DU CAMP TECHNOLOGIQUE
// =====================================================


// 1. Charger la présentation du Camp
async function chargerPresentationCamp() {
    const presentation = document.getElementById("camp-presentation");

    if (!presentation || !window.ptkSupabase) {
        console.error("Présentation ou connexion Supabase introuvable.");
        return;
    }

    const { data, error } = await window.ptkSupabase
        .from("contenus_pages")
        .select("contenu")
        .eq("page", "camp_technologique")
        .eq("cle", "camp_presentation")
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


// 2. Créer une carte de contenu
function creerCarteCamp(element, type, index) {
    const carte = document.createElement("article");

    carte.className = type === "module"
        ? "card module-card"
        : "card";

    // Icône ou numéro
    if (type !== "pedagogie") {
        const icone = document.createElement("span");

        if (type === "module") {
            icone.className = "module-icon";
            icone.setAttribute("aria-hidden", "true");
            icone.textContent = element.icone || "•";
        } else {
            icone.className = "card-icon";
            icone.setAttribute("aria-hidden", "true");
            icone.textContent = element.icone || String(index + 1).padStart(2, "0");
        }

        carte.appendChild(icone);
    }

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


// 3. Charger les objectifs, modules et éléments pédagogiques
async function chargerElementsCamp() {
    if (!window.ptkSupabase) {
        console.error("Connexion Supabase introuvable.");
        return;
    }

    const { data, error } = await window.ptkSupabase
        .from("elements_programme")
        .select("programme,type_element,titre,description,icone,ordre")
        .eq("programme", "camp_technologique")
        .eq("est_publie", true)
        .order("ordre", { ascending: true });

    if (error) {
        console.error("Erreur de chargement des éléments du Camp :", error);
        return;
    }

    if (!data || data.length === 0) {
        console.warn("Aucun élément publié pour le Camp technologique.");
        return;
    }

    // Correspondance entre les catégories Supabase et les zones HTML
    const zones = {
        objectif: document.getElementById("camp-objectifs"),
        module: document.getElementById("camp-modules"),
        pedagogie: document.getElementById("camp-pedagogie")
    };

    // Séparer les éléments par catégorie
    const categories = {
        objectif: [],
        module: [],
        pedagogie: []
    };

    data.forEach(element => {
        if (categories[element.type_element]) {
            categories[element.type_element].push(element);
        }
    });

    // Remplacer les cartes HTML par les données Supabase
    Object.keys(categories).forEach(type => {
        const zone = zones[type];
        const elements = categories[type];

        if (!zone || elements.length === 0) {
            return;
        }

        zone.replaceChildren();

        elements.forEach((element, index) => {
            const carte = creerCarteCamp(element, type, index);
            zone.appendChild(carte);
        });
    });

    console.log("Objectifs, modules et pédagogie du Camp chargés depuis Supabase.");
}


// 4. Lancer le chargement des contenus
async function chargerContenuCamp() {
    await Promise.all([
        chargerPresentationCamp(),
        chargerElementsCamp()
    ]);
}

chargerContenuCamp();
