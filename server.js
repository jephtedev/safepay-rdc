const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Autorise ton Dashboard (GitHub Pages) et ton App Mobile à communiquer avec l'API
app.use(cors());
// Permet à l'API de lire les données envoyées au format JSON
app.use(express.json());

// Port dynamique pour s'adapter automatiquement à l'hébergement (Render, etc.)
const PORT = process.env.PORT || 5000;

// --- BASE DE DONNÉES TEMPORAIRE (Simulation) ---

let vendors = {
    "TechStore": {
        name: "TechStore",
        availableBalance: 1250, 
        phoneNumber: "+243812345678", 
        network: "M-Pesa"
    }
};

let transactions = [
    {
        _id: "664c1234e5678901234567f1", // Simule un ID MongoDB pour ton admin.html
        numeroCommande: "CMD1257",
        acheteur: "Marc", // Harmonisé avec tx.acheteur utilisé dans admin.html
        telephoneClient: "+243891111111",
        adresseLivraison: "Limete, Kinshasa, RDC",
        vendeur: "TechStore",
        produit: "Montre Connectée",
        montant: 85,
        devise: "USD",
        modePaiement: "Orange Money",
        statut: "Validé", 
        otpValidation: "4412",
        createdAt: new Date(),
        libereAt: new Date()
    },
    {
        _id: "664c1234e5678901234567f2", // Simule un ID MongoDB
        numeroCommande: "CMD1258",
        acheteur: "Jean", // Harmonisé avec tx.acheteur utilisé dans admin.html
        telephoneClient: "+243812345678",
        adresseLivraison: "Avenue de la Paix, Gombe, Kinshasa, RDC",
        vendeur: "TechStore",
        produit: "Casque Bluetooth",
        montant: 120,
        devise: "USD",
        modePaiement: "M-Pesa",
        statut: "En attente", 
        otpValidation: "5821",
        createdAt: new Date()
    }
];

// --- LES ROUTES DE L'API (BACKEND) ---

// 1. Tester si l'API fonctionne
app.get('/', (req, res) => {
    res.send('🔒 Serveur SafePay RDC actif et hautement sécurisé.');
});

// 2. CORRECTION CRITIQUE : Route globale demandée par admin.html
app.get('/api/transactions', (req, res) => {
    // Renvoie directement le tableau des transactions inversé (plus récentes d'abord)
    // pour correspondre au code : const transactions = await response.json();
    res.status(200).json(transactions.slice().reverse());
});

// 3. Récupérer les données dynamiques du tableau de bord d'un vendeur
app.get('/api/vendor/:name/dashboard', (req, res) => {
    const vendorName = req.params.name;
    const vendor = vendors[vendorName];
    
    if (!vendor) {
        return res.status(404).json({ success: false, message: "Vendeur introuvable." });
    }

    const vendorTx = transactions.filter(t => t.vendeur === vendorName);

    const totalOrders = vendorTx.length;
    const pendingOrders = vendorTx.filter(t => t.statut === "En attente").length;
    const completedOrders = vendorTx.filter(t => t.statut === "Validé").length;

    res.status(200).json({
        success: true,
        data: {
            vendeur: vendor.name,
            soldeDisponible: vendor.availableBalance,
            statistiques: {
                total: totalOrders,      
                enCours: pendingOrders,  
                terminees: completedOrders 
            },
            commandesRecentes: vendorTx.reverse()
        }
    });
});

// 4. Étape d'Achat : Bloquer l'argent dans le système (Séquestre)
app.post('/api/transactions/bloquer', (req, res) => {
    const { client, telephoneClient, adresseLivraison, vendeur, produit, montant, modePaiement } = req.body;

    if (!client || !vendeur || !produit || !montant) {
        return res.status(400).json({ 
            success: false, 
            message: "Erreur : Veuillez fournir le client, le vendeur, le produit et le montant." 
        });
    }

    // Crée un id de type MongoDB héxadécimal pour éviter les bugs d'affichage
    const fakeMongoId = require('crypto').randomBytes(12).toString('hex');

    const nouvelleTransaction = {
        _id: fakeMongoId, 
        numeroCommande: `CMD${Math.floor(1000 + Math.random() * 9000)}`,
        acheteur: client,
        telephoneClient: telephoneClient || "+243000000000",
        adresseLivraison: adresseLivraison || "Kinshasa, RDC",
        vendeur,
        produit,
        montant: parseInt(montant),
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

// 5. Étape de Validation : Débloquer l'argent via OTP
app.post('/api/transactions/debloquer', (req, res) => {
    const { transactionId, otp } = req.body;
    // Vérifie à la fois sur _id ou id pour éviter les conflits frontend
    const tx = transactions.find(t => t._id === transactionId || t.id === transactionId);

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

    tx.statut = "Validé";
    tx.libereAt = new Date();

    if (vendors[tx.vendeur]) {
        vendors[tx.vendeur].availableBalance += tx.montant;
    }

    res.status(200).json({
        success: true,
        message: `Félicitations ! Livraison validée. Le montant de ${tx.montant}$ a été versé sur le compte disponible du vendeur ${tx.vendeur}.`,
        data: tx
    });
});

// 6. Action du bouton "Retirer l'argent"
app.post('/api/vendor/retrait', (req, res) => {
    const { vendeurName, montant } = req.body;
    const vendor = vendors[vendeurName];

    if (!vendor) {
        return res.status(404).json({ success: false, message: "Vendeur introuvable." });
    }

    if (vendor.availableBalance < montant) {
        return res.status(400).json({ success: false, message: "Solde disponible insuffisant pour ce retrait." });
    }

    vendor.availableBalance -= montant;
    console.log(`[PAYOUT] Envoi de ${montant}$ vers le numéro ${vendor.phoneNumber} (${vendor.network})`);

    res.status(200).json({
        success: true,
        message: `Le retrait de ${montant}$ a été approuvé. Les fonds sont en cours d'envoi vers votre compte ${vendor.network}.`,
        nouveauSolde: vendor.availableBalance
    });
});

// 7. Gestion des litiges
app.post('/api/transactions/litige', (req, res) => {
    const { transactionId } = req.body;
    const tx = transactions.find(t => t._id === transactionId || t.id === transactionId);

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
            
