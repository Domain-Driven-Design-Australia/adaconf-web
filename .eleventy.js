import { minify } from "html-minifier";
import markdownIt from "markdown-it";
import pluginRss from "@11ty/eleventy-plugin-rss";
import fetch from "@11ty/eleventy-fetch";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import site from "./src/_data/site.json" with { type: "json" };

const isPages = process.env.ELEVENTY_ENV === 'pages'
const outDir = isPages ? 'docs' : 'public'

export default function (eleventyConfig) {
  // PLUGINS
  eleventyConfig.addPlugin(pluginRss);

  // shortcode to render markdown from string => {{ STRING | markdown | safe }}
  eleventyConfig.addFilter('markdown', function (value) {
    let markdown = markdownIt({
      html: true
    });
    return markdown.render(value);
  });

  // rebuild on CSS changes
  eleventyConfig.addWatchTarget('./src/_includes/css/');

  // Markdown
  eleventyConfig.setLibrary(
    'md',
    markdownIt({
      html: true,
      breaks: true,
      linkify: true,
      typographer: true
    })
  )

  //create collections
  eleventyConfig.addCollection('sections', async (collection) => {
    return collection.getFilteredByGlob('./src/sections/*.md');
  });

  // // Speaker List
  if (site.sessionize_apis.speakers) {
    const slugify = eleventyConfig.getFilter("slugify");
    const sessionizeImageUrl = '/img/speakers/sessionize';
    const sessionizeImagePath = join(outDir, sessionizeImageUrl);
    mkdir(sessionizeImagePath, { recursive: true });
    eleventyConfig.ignores.delete(sessionizeImagePath);
    eleventyConfig.watchIgnores.add(sessionizeImagePath);
    eleventyConfig.addCollection('sessionizeSpeakers', async () => {
      const speakers = await fetch(`https://sessionize.com/api/v2/${site.sessionize_apis.speakers}/view/Speakers`, {
        duration: "1d",
        type: "json",
      });
      for (const speaker of speakers) {
        if (speaker.profilePicture) {
          const image = await fetch(speaker.profilePicture, {
            duration: "1d",
            type: "buffer"
          });
          const imageFileName = `${slugify(speaker.fullName)}.png`;

          const relativeImagePath = join(sessionizeImagePath, imageFileName);
          await writeFile(relativeImagePath, image);

          speaker.relativeProfilePicture = join(sessionizeImageUrl, imageFileName);
          console.log(`Writing ${imageFileName} to ${relativeImagePath} so it can be served from ${speaker.relativeProfilePicture}`);
        }
      }
      return speakers;
    });
  }


  // // Workshops
  // eleventyConfig.addCollection('sessionizeWorkshops', async () => {
  //   let workshops = await fetch('https://sessionize.com/api/v2/3qfvo45q/view/Sessions', {
  //     duration: "1d",
  //     type: "json",
  //   });
  //   for (const workshopGroup of workshops) {
  //     if (workshopGroup.groupName.match(/1/) || workshopGroup.groupName.match(/One/)) {
  //       workshopGroup.groupName = "One Day Workshops";
  //       workshopGroup.dates = "Thu 13th Nov, 2025";
  //     } else {
  //       workshopGroup.groupName = "Two Day Workshops";
  //       workshopGroup.dates = "Wed 12th - Thu 13th Nov, 2025";
  //     }
  //   }
  //   return workshops;
  // });

  // Agenda
  eleventyConfig.addCollection('sessionizeAgenda', async () => {
    return await fetch(`https://sessionize.com/api/v2/${site.sessionize_apis.agenda}/view/GridSmart`, {
      duration: "1d",
      type: "string",
    });
  });

  eleventyConfig.addFilter("speaker", (speakers, speakerId) =>
    speakers.find(sp => sp.id == speakerId)
  );

  // STATIC FILES
  eleventyConfig.addPassthroughCopy({ './src/static/': '/' });

  // TRANSFORM -- Minify HTML Output
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      let minified = minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true
      });
      return minified;
    }
    return content;
  });

  return {
    dir: {
      input: 'src',
      output: outDir,
      data: './_data',
      includes: './_includes',
      layouts: './_layouts'
    },
    templateFormats: [
      'md',
      'njk',
      '11ty.js'
    ],
    htmlTemplateEngine: 'njk'
  };
};