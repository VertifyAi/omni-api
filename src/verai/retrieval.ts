/* eslint-disable import/extensions */
import { RunnableConfig } from '@langchain/core/runnables';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { ensureConfiguration } from './configuration';
import { Embeddings } from '@langchain/core/embeddings';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function makeQdrantRetriever(
  configuration: ReturnType<typeof ensureConfiguration>,
  embeddingModel: Embeddings,
): Promise<VectorStoreRetriever> {
  const qdrantUrl = 'http://qdrant.vertify.com.br:6333';
  const collectionName = configuration.collectionName || 'default';

  if (!qdrantUrl) {
    throw new Error('QDRANT_URL environment variable is not defined');
  }

  const client = new QdrantClient({
    url: qdrantUrl,
    checkCompatibility: false,
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddingModel,
    {
      client,
      collectionName,
    },
  );

  // const filter = {
  //   should: [
  //     {
  //       key: "user_id",
  //       match: { value: configuration.userId },
  //     },
  //   ],
  //   ...configuration.searchKwargs,
  // };

  // return vectorStore.asRetriever({ filter });
  return vectorStore.asRetriever();
}

function makeTextEmbeddings(modelName: string): Embeddings {
  /**
   * Connect to the configured text encoder.
   */
  const index = modelName.indexOf('/');
  let provider, model;
  if (index === -1) {
    model = modelName;
    provider = 'openai'; // Assume openai if no provider included
  } else {
    provider = modelName.slice(0, index);
    model = modelName.slice(index + 1);
  }
  switch (provider) {
    case 'openai':
      return new OpenAIEmbeddings({ model });
    default:
      throw new Error(`Unsupported embedding provider: ${provider}`);
  }
}

export async function makeRetriever(
  config: RunnableConfig,
): Promise<VectorStoreRetriever> {
  const configuration = ensureConfiguration(config);
  const embeddingModel = makeTextEmbeddings(configuration.embeddingModel);

  const userId = configuration.userId;
  if (!userId) {
    throw new Error('Please provide a valid user_id in the configuration.');
  }

  switch (configuration.retrieverProvider) {
    case 'qdrant':
      return makeQdrantRetriever(configuration, embeddingModel);
    default:
      throw new Error(
        `Unrecognized retrieverProvider in configuration: ${configuration.retrieverProvider}`,
      );
  }
}
