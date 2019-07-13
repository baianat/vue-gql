import { mount, createLocalVue } from '@vue/test-utils';
import flushPromises from 'flush-promises';
import { Subscription, createClient, Provider } from '../src/index';

const Vue = createLocalVue();
Vue.component('Subscription', Subscription);

function makeObservable() {
  let interval: any;
  let counter = 0;
  const observable = {
    subscribe: function({ next }: { next: Function }) {
      interval = setInterval(() => {
        next({ data: { message: 'New message', id: counter++ } });
      }, 100);

      afterAll(() => {
        clearTimeout(interval);
      });

      return {
        unsubscribe() {
          clearTimeout(interval);
        }
      };
    }
  };

  return observable;
}

test('Handles subscriptions', async () => {
  const client = createClient({
    url: 'https://test.baianat.com/graphql',
    subscriptionForwarder: () => {
      return makeObservable();
    }
  });

  const wrapper = mount(
    {
      data: () => ({
        client
      }),
      components: {
        Subscription,
        Provider,
        Child: {
          props: ['newMessages'],
          data: () => ({ messages: [] }),
          watch: {
            newMessages(this: any, message: object) {
              this.messages.push(message);
            }
          },
          template: `
            <div>
              <ul>
                <li v-for="msg in messages">{{ msg.id }}</li>
              </ul>
            </div>
          `
        }
      },
      template: `
      <div>
        <Provider :client="client">
          <div>
            <Subscription query="subscription { newMessages }" v-slot="{ data }">
              <Child :newMessages="data" />
            </Subscription>
          </div>
        </Provider>
      </div>
    `
    },
    { sync: false }
  );

  await (global as any).sleep(501);
  await flushPromises();
  expect(wrapper.findAll('li')).toHaveLength(5);
  wrapper.destroy();
});
