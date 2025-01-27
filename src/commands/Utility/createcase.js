const { ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require('../../structure/ApplicationCommand');
const path = require('path');
const { google } = require('googleapis');
const config = require("../../config");

module.exports = new ApplicationCommand({
    __type__: 1, // Application Command
    command: {
        name: 'maak-casus',
        description: 'Maak een nieuwe casus aan en voeg deze toe aan de lijst met actieve casussen.',
        type: 1, // Slash command type
        options: [
            {
                name: 'title',
                type: 3, // String
                description: 'Titel van de casus',
                required: true,
            },
            {
                name: 'usertag',
                type: 3, // String
                description: 'De user tag (e.g., @username#1234)',
                required: true,
            },
        ],
    },
    options: {
        botDevelopers: true,
        cooldown: 5000, // 5-second cooldown
    },
    /**
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        try {
            await interaction.deferReply();

            const title = interaction.options.getString('title');
            const userTag = interaction.options.getString('usertag');
    
            const userIdMatch = userTag.match(/^<@!?\d+>$/);
            if (!userIdMatch) {
                return interaction.followUp({
                    content: 'Invalid user tag format. Please tag a user correctly.',
                    ephemeral: true,
                });
            }
    
            const taggedUserId = userIdMatch[0].match(/\d+/)[0];
            let member = interaction.guild.members.cache.get(taggedUserId);
            if (!member) {
                member = await interaction.guild.members.fetch(taggedUserId);
            }
    
            if (!member) {
                return interaction.followUp({
                    content: 'Could not find the user in the server.',
                    ephemeral: true,
                });
            }
    
            const nickname = member.nickname || member.user.username;
            const currentdate = new Date().toLocaleDateString();

            const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');
            const auth = new google.auth.GoogleAuth({
                keyFile: CREDENTIALS_PATH,
                scopes: [
                    'https://www.googleapis.com/auth/drive',
                    'https://www.googleapis.com/auth/documents',
                ],
            });
            const drive = google.drive({ version: 'v3', auth });
            const docs = google.docs({ version: 'v1', auth });
            const BASE_DOC_ID = '1PBukeWLhF4iAZSYK2mYAYjVCWu0ecnFsZgV7Ajg5tSc';
            const response = await drive.files.copy({
                fileId: BASE_DOC_ID,
                requestBody: {
                    name: `Operatie ${title} `,
                },
            });

            const newDocId = response.data.id;

            drive.permissions.create({
                fileId: newDocId,
                requestBody: {
                    type: 'anyone',
                    role: 'writer',
                },
            });
            docs.documents.batchUpdate({
                documentId: newDocId,
                requestBody: {
                    requests: [
                        {
                            replaceAllText: {
                                containsText: {
                                    text: '{{titel}}',
                                    matchCase: true,
                                },
                                replaceText: `Operatie ${title} - `,
                            },
                        },
                        {
                            replaceAllText: {
                                containsText: {
                                    text: '{{rechercheur}}',
                                    matchCase: true,
                                },
                                replaceText: nickname,
                            },
                        },
                        {
                            replaceAllText: {
                                containsText: {
                                    text: '{{date}}',
                                    matchCase: true,
                                },
                                replaceText: currentdate,
                            },
                        },
                    ],
                },
            });

            const category = interaction.guild.channels.cache.find(
                (channel) => channel.id === config.Levisconfig.catogoryIDs.ongoingCases && channel.type === 4
            );
            
            if (!category) {
                return interaction.followUp({
                    content: 'Er is geen catogorie gevonden, voeg een CatogoryID toe in de config.js bestand.',
                    ephemeral: true,
                });
            }

            const caseChannel = await interaction.guild.channels.create({
                name: `『📒』Operatie ${title}`,
                type: 0,
                parent: category.id,
            });

            await interaction.followUp({
                content: `Er is een nieuwe casus aangemaakt: <#${caseChannel.id}>`,
                ephemeral: true,
            });

            const logChannel = interaction.guild.channels.cache.find(
                (channel) => channel.id === config.Levisconfig.channelIDs.caseLog && channel.type === 0
            );
            
            if (!logChannel) {
                return interaction.followUp({
                    content: 'Er is geen log channel gevonden, voeg een channelID toe in de config.js bestand.',
                    ephemeral: true,
                });
            }

            let embedMessage;
            const fetchMessages = await logChannel.messages.fetch({ limit: 10 });
            embedMessage = fetchMessages.find((msg) => msg.author.id === client.user.id && msg.embeds.length > 0);

            if (!embedMessage) {
                const newEmbed = new EmbedBuilder()
                    .setTitle('📄 Actieve Casussen')
                    .setDescription('Lijst van alle actieve casussen:')
                    .setColor(0x00ff00)
                    .setTimestamp();

                embedMessage = await logChannel.send({ embeds: [newEmbed] });
            }

            const embed = embedMessage.embeds[0];
            const fields = embed.fields || [];

            // Add new case for the user
            const userMention = `<@${member.id}>`; // Proper user mention for the value field
            const caseEntry = ` <#${caseChannel.id}>`;
            const existingField = fields.find((field) => field.name === nickname); // Group by nickname or tag
            
            if (existingField) {
                existingField.value += `\n${caseEntry}`;
            } else {
                fields.push({
                    name: nickname, // Use nickname as plain text
                    value: `${caseEntry}`, // Add the clickable channel link
                    inline: false,
                });
            }
            const updatedEmbed = EmbedBuilder.from(embed).setFields(fields);

            await embedMessage.edit({ embeds: [updatedEmbed] });

            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`Welkom bij ${title}`)
                .setDescription(`Dit is de start van de casus voor ${userTag}.`)
                .setColor(0x00ff00);

            // Create the button to update the description
            const updateDescriptionButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('update-description')
                    .setLabel('Geef een beschrijving op')
                    .setStyle(ButtonStyle.Primary)
            );

            // Send the welcome message with the button
            await caseChannel.send({ embeds: [welcomeEmbed], components: [updateDescriptionButton] });

            const sentMessage = await caseChannel.send({
                content: `Google Docs file created: [View Document](https://docs.google.com/document/d/${newDocId})`,
            });
            
            // Pin the sent message in the channel
            await sentMessage.pin();
        } catch (err) {
            console.error('Error executing create-case command:', err);
            interaction.followUp({
                content: 'An error occurred while executing this command.',
                ephemeral: true,
            });
        }
    },
}).toJSON();
