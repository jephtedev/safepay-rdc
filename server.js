const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Autorise ton Dashboard (GitHub Pages) et ton App Mobile à communiquer avec l'API
app.use(cors());
// Permet à l'API de lire les données envoyées au format JSON
app.use(express.json());

// Port dynamique pour s'adapter automatiquement à l'hébergement (Render, Heroku, etc.)
const PORT = process.env.PORT || 5000;

// --- BASE DE DONNÉES TEMPORAIRE (Simulation) ---

// 1. Profil du vendeur TechStore (lié à ta maquette)
let vendors = {
    "TechStore": {
        name: "TechStore",
        availableBalance: 1250, // Le solde disponible pour retrait affiché sur ton écran (1250 $)
        phoneNumber: "+243812345678", // Numéro lié pour recevoir les retraits
        network: "M-Pesa"
    }
};

// 2. Historique des transactions (Séquestre)
let transactions = [
    {
        id: "TRX1257",
        numeroCommande: "CMD1257",
        client: "Marc",
        telephoneClient: "+243891111111",
        adresseLivraison: "Limete, Kinshasa, RDC",
        vendeur: "TechStore",
        produit: "Montre Connectée",
        montant: 85,
        devise: "USD",
        modePaiement: "Orange Money",
        statut: "Validé", // Déjà livré -> l'argent est déjà inclus dans le solde disponible (1250$)
        otpValidation: "4412",
        createdAt: new Date(),
        libereAt: new Date()
    },
    {
        id: "TRX1258",
        numeroCommande: "CMD1258",
        client: "Jean",
        telephoneClient: "+243812345678",
        adresseLivraison: "Avenue de la Paix, Gombe, Kinshasa, RDC",
        vendeur: "TechStore",
        produit: "Casque Bluetooth",
        montant: 120,
        devise: "USD",
        modePaiement: "M-Pesa",
        statut: "En attente", // "En attente de validation" sur ta maquette -> argent bloqué
        otpValidation: "5821",
        createdAt: new Date()
    }
];

// --- LES ROUTES DE L'API (BACKEND) ---

// 1. Tester si l'API fonctionne
app.get('/', (req, res) => {
    res.send('🔒 Serveur SafePay RDC actif et hautement sécurisé.');
});

// 2. Récupérer les données dynamiques du tableau de bord d'un vendeur (Pour alimenter ta maquette)
app.get('/api/vendor/:name/dashboard', (req, res) => {
    const vendorName = req.params.name;
    const vendor = vendors[vendorName];
    
    if (!vendor) {
        return res.status(404).json({ success: false, message: "Vendeur introuvable." });
    }

    // Filtrer les transactions spécifiques à ce vendeur
    const vendorTx = transactions.filter(t => t.vendeur === vendorName);

    // Calculer les compteurs dynamiques pour les blocs de ta maquette
    const totalOrders = vendorTx.length;
    const pendingOrders = vendorTx.filter(t => t.statut === "En attente").length;
    const completedOrders = vendorTx.filter(t => t.statut === "Validé").length;

    res.status(200).json({
        success: true,
        data: {
            vendeur: vendor.name,
            soldeDisponible: vendor.availableBalance,
            statistiques: {
                total: totalOrders,      // Correspond à "COMMANDES"
                enCours: pendingOrders,  // Correspond à "EN COURS" (ex: 5)
                terminees: completedOrders // Correspond à "TERMINÉES" (ex: 27)
            },
            commandesRecentes: vendorTx.reverse() // Les plus récentes en premier
        }
    });
});

// 3. Étape d'Achat : Bloquer l'argent dans le système (Séquestre)
app.post('/api/transactions/bloquer', (req, res) => {
    const { client, telephoneClient, adresseLivraison, vendeur, produit, montant, modePaiement } = req.body;

    if (!client || !vendeur || !produit || !montant) {
        return res.status(400).json({ 
            success: false, 
            message: "Erreur : Veuillez fournir le client, le vendeur, le produit et le montant." 
        });
    }

    const nouvelleTransaction = {
        id: `TRX${Math.floor(1000 + Math.random() * 9000)}`, 
        numeroCommande: `CMD${Math.floor(1000 + Math.random() * 9000)}`,
        client,
        telephoneClient: telephoneClient || "+243000000000",
        adresseLivraison: adresseLivraison || "Kinshasa, RDC",
        vendeur,
        produit,
        montant,
        devise: "USD",
        modePaiement: modePaiement || "M-Pesa",
        statut: "En attente",
        otpValidation: Math.floor(1000 + Math.random() * 9000).toString(), 
        createdAt: new Date()
    };

    transactions.push(nouvelleTransaction);

    res.status(201).json({
        success: true,
        message: "L'argent a été retiré du client et bloqué en toute sécurité par SafePay RDC.",
        data: nouvelleTransaction
    });
});

// 4. Étape de Validation : Débloquer l'argent et l'ajouter au solde disponible du vendeur
app.post('/api/transactions/debloquer', (req, res) => {
    const { transactionId, otp } = req.body;
    const tx = transactions.find(t => t.id === transactionId);

    if (!tx) {
        return res.status(404).json({ success: false, message: "Transaction introuvable." });
    }

    if (tx.statut !== "En attente") {
        return res.status(400).json({ 
            success: false, 
            message: `Impossible de modifier. Cette transaction est déjà : ${tx.statut}` 
        });
    }

    if (tx.otpValidation !== otp) {
        return res.status(401).json({ 
            success: false, 
            message: "Code OTP incorrect. Sécurité SafePay : Fonds toujours bloqués." 
        });
    }

    // Le code OTP est correct : On valide la transaction
    tx.statut = "Validé";
    tx.libereAt = new Date();

    // CRITICAL : On crédite immédiatement le solde disponible du vendeur
    if (vendors[tx.vendeur]) {
        vendors[tx.vendeur].availableBalance += tx.montant;
    }

    res.status(200).json({
        success: true,
        message: `Félicitations ! Livraison validée. Le montant de ${tx.montant}$ a été versé sur le compte disponible du vendeur ${tx.vendeur}.`,
        data: tx
    });
});

// 5. Action du bouton "Retirer l'argent" (Payout B2C vers Mobile Money)
app.post('/api/vendor/retrait', (req, res) => {
    const { vendeurName, montant } = req.body;
    const vendor = vendors[vendeurName];

    if (!vendor) {
        return res.status(404).json({ success: false, message: "Vendeur introuvable." });
    }

    if (vendor.availableBalance < montant) {
        return res.status(400).json({ success: false, message: "Solde disponible insuffisant pour ce retrait." });
    }

    // Déduction du solde disponible du vendeur
    vendor.availableBalance -= montant;

    // --- ICI TU INTEGRERAS L'API PAYOUT (FlexPay, Flutterwave ou MaxiCash) ---
    console.log(`[PAYOUT] Envoi de ${montant}$ vers le numéro ${vendor.phoneNumber} (${vendor.network})`);

    res.status(200).json({
        success: true,
        message: `Le retrait de ${montant}$ a été approuvé. Les fonds sont en cours d'envoi vers votre compte ${vendor.network}.`,
        nouveauSolde: vendor.availableBalance
    });
});

// 6. Gestion des litiges
app.post('/api/transactions/litige', (req, res) => {
    const { transactionId } = req.body;
    const tx = transactions.find(t => t.id === transactionId);

    if (!tx) return res.status(404).json({ success: false, message: "Transaction introuvable." });

    tx.statut = "En litige";
    
    res.status(200).json({
        success: true,
        message: "La transaction a été suspendue. L'équipe SafePay va analyser les preuves de livraison.",
        data: tx
    });
});

// Lancement de l'écoute du serveur
app.listen(PORT, () => {
    console.log(`[SafePay RDC] Serveur démarré avec succès sur le port ${PORT}`);
});
        
