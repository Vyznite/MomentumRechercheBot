const { success } = require("../../utils/Console");
const Event = require("../../structure/Event");
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { Levisconfig } = require("../../config");

module.exports = new Event({
    event: 'ready',
    once: true,
    run: async (__client__, client) => {
        success(`✅ Ingelogd als ${client.user.tag}, duurde ${((Date.now() - __client__.login_timestamp) / 1000)}s.`);
        
        // Update de embed bij opstart
        updateEmbed(client);
    }
}).toJSON();

// **Zelfde updateEmbed functie als in onRoleUpdate.js**
async function updateEmbed(client) {
    const filePath = path.resolve("./src/database.json");

    try {
        const data = fs.readFileSync(filePath, "utf-8");
        const database = JSON.parse(data);
        const channel = client.channels.cache.get(Levisconfig.channelIDs.caseLog);

        if (!channel) {
            console.error("❌ Kanaal niet gevonden.");
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("📄 Actieve Casussen")
            .setColor(0x00ff00)
            .setFooter({ text: "Recherche", iconURL: client.user.displayAvatarURL() });

        database.rechercheurs.forEach(rechercheur => {
            let casussenBeschrijving = "";
            rechercheur.casussen.forEach(casus => {
                casussenBeschrijving += `<#${casus.casusID}> \n    **Status:** ${casus.status}\n\n`;
            });

            embed.addFields({
                name: `👤 ${rechercheur.naam}`,
                value: casussenBeschrijving || "Geen casussen gevonden.",
                inline: false
            });
        });

        // Zoek het laatste bericht in het kanaal en update de embed
        const messages = await channel.messages.fetch({ limit: 10 });
        const botMessage = messages.find(msg => msg.author.id === client.user.id);

        if (botMessage) {
            botMessage.edit({ embeds: [embed] });
            success("✅ Embed succesvol geüpdatet.");
        } else {
            channel.send({ embeds: [embed] }).then(() => success("✅ Nieuwe embed verzonden."));
        }

    } catch (err) {
        console.error("❌ Fout bij updaten van embed:", err);
    }
}
