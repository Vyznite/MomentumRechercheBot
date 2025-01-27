const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { Levisconfig } = require("../config");

async function updateEmbed(client) {
    const filePath = path.resolve('./src/database.json');

    let database;
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        database = JSON.parse(data);
    } catch (err) {
        console.error('❌ Kan database.json niet lezen:', err);
        return;
    }

    // Maak een embed
    const embed = new EmbedBuilder()
        .setTitle('📄 Actieve Casussen')
        .setColor(0x00ff00)
        .setFooter({ text: 'Recherche', iconURL: client.user.displayAvatarURL() });

    // Voeg iedere rechercheur toe als een apart veld
    database.rechercheurs.forEach(rechercheur => {
        let casussenBeschrijving = '';
        rechercheur.casussen.forEach(casus => {
            casussenBeschrijving += `<#${casus.casusID}> \n    **Status:** ${casus.status}\n\n`;
        });

        embed.addFields({
            name: `👤 ${rechercheur.naam}`,
            value: casussenBeschrijving || 'Geen casussen gevonden.',
            inline: false,
        });
    });

    // Zoek het kanaal
    const channel = client.channels.cache.get(Levisconfig.channelIDs.caseLog);
    if (!channel) {
        console.error('❌ Kanaal niet gevonden. Controleer of de kanaal-ID correct is.');
        return;
    }

    // Probeer het laatste bericht van de bot te vinden
    try {
        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessage = messages.find(msg => msg.author.id === client.user.id);

        if (botMessage) {
            await botMessage.edit({ embeds: [embed] });
            console.log("✅ Embed succesvol geüpdatet!");
        } else {
            const newMessage = await channel.send({ embeds: [embed] });
            console.log("✅ Nieuwe embed verzonden:", newMessage.id);
        }
    } catch (err) {
        console.error("❌ Fout bij het updaten van de embed:", err);
    }
}

module.exports = { updateEmbed };
