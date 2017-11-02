const rp = require("request-promise-native");
const _ = require("lodash");
const Discord = require("discord.js");
const log = require("log4js").getLogger("standard");

class Standard {

    constructor() {
        this.api = "http://whatsinstandard.com/api/4/sets.json";
        this.commands = {
            standard: {
                aliases: [],
                inline: false,
                description: "Lists the currently standard legal sets and when they will rotate",
                help: 'Standard is a rotating group of Magic: The Gathering sets. Most sets enter Standard when ' +
                'they\'re released and drop out about eighteen months later. (Masters sets never enter Standard.1)\n\n' +
                'A Standard card is a card printed or reprinted into a set currently in Standard. \n\n' +
                'A deck which contains only Standard cards is called a Standard deck.\n\n' +
                'From :link: http://whatsinstandard.com/',
                examples: ["!standard"]
            }
        };
        this.cachedEmbed = null;
        this.cachedTime = null;
        this.cacheExpireTime = 24 * 60 * 60 * 1000; //day in milliseconds
        this.loadList().then(() => {
            log.info("Standard is cached");
        });
    }

    getCommands() {
        return this.commands;
    }

    generateEmbed(setList) {
        const currentDate = new Date();
        const removedFutureSetList = setList.filter(set => {
            const releaseDate = new Date(set.enter_date);
            return currentDate.getTime() >= releaseDate.getTime();
        });
        const groupedSetList = _.groupBy(removedFutureSetList, "rough_exit_date");
        const descriptions = [];
        _.forEach(groupedSetList, (value, key) => {
            descriptions.push("*Rotates ", key, ":*```", value.map(set => set.name).join(" | "), "```\n");
        });
        const embed = new Discord.RichEmbed({
            title: "Currently in Standard",
            url: "http://whatsinstandard.com/",
            description: descriptions.join("")
        });
        this.cachedEmbed = embed;
        this.cachedTime = currentDate.getTime();
        return embed;
    }

    loadList() {
        return rp({url: this.api, json: true}).then(body => {
            if (typeof body !== "object") {
                return null;
            } else {
                return this.generateEmbed(body);
            }
        }, err => {
            log.error("Error getting Standard list", err.error.details);
            return new Discord.RichEmbed({
                title: "Standard - Error",
                description: "Couldn't create Standard list.",
                color: 0xff0000
            });
        });
    }

    handleMessage(command, parameter, msg) {
        if (this.cachedEmbed !== null && this.cachedTime !== null && new Date().getTime() - this.cachedTime < this.cacheExpireTime) {
            return msg.channel.send("", {embed: this.cachedEmbed});
        }
        this.loadList().then(embed => {
            msg.channel.send("", {embed: embed});
        });
    }
}

module.exports = Standard;